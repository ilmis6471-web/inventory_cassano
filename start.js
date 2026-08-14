const fs=require('fs');
const path=require('path');
const src=fs.readFileSync(path.join(__dirname,'server.js'),'utf8');

// Cassano vault schema + routes. Vault editing remains Bos/Consigliere only.
const vaultSchema=`
CREATE TABLE IF NOT EXISTS vault(
  id INTEGER PRIMARY KEY DEFAULT 1,
  balance NUMERIC(18,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO vault(id,balance) VALUES(1,0) ON CONFLICT(id) DO NOTHING;
CREATE TABLE IF NOT EXISTS vault_transactions(
  id SERIAL PRIMARY KEY,
  vault_id INTEGER REFERENCES vault(id),
  type TEXT NOT NULL,
  amount NUMERIC(18,2) NOT NULL,
  balance_after NUMERIC(18,2) NOT NULL,
  note TEXT DEFAULT '',
  user_id INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
`;

const vaultRoutes=`
app.get('/api/vault',auth,async(req,res)=>{
  try{
    const v=await one('SELECT * FROM vault WHERE id=1');
    const tx=await q('SELECT t.*,u.name user FROM vault_transactions t LEFT JOIN users u ON u.id=t.user_id ORDER BY t.id DESC LIMIT 50');
    res.json({balance:Number(v?.balance||0),updated_at:v?.updated_at||null,transactions:tx});
  }catch(e){res.status(500).json({error:e.message})}
});
app.post('/api/vault/adjust',auth,async(req,res)=>{
  if(!['Bos','Consigliere'].includes(req.me.role))return res.status(403).json({error:'Hanya Bos dan Consigliere yang dapat mengedit uang brangkas'});
  const amount=Number(req.body.amount),type=req.body.type,note=(req.body.note||'').trim();
  if(!Number.isFinite(amount)||amount<=0)return res.status(400).json({error:'Nominal tidak valid'});
  if(!['IN','OUT'].includes(type))return res.status(400).json({error:'Jenis transaksi tidak valid'});
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const v=(await client.query('SELECT * FROM vault WHERE id=1 FOR UPDATE')).rows[0];
    const current=Number(v.balance||0),next=type==='IN'?current+amount:current-amount;
    if(next<0)throw new Error('Saldo brangkas tidak mencukupi');
    await client.query('UPDATE vault SET balance=$1,updated_at=NOW() WHERE id=1',[next]);
    await client.query('INSERT INTO vault_transactions(vault_id,type,amount,balance_after,note,user_id) VALUES(1,$1,$2,$3,$4,$5)',[type,amount,next,note,req.me.id]);
    await client.query('COMMIT');
    res.json({ok:true,balance:next});
  }catch(e){await client.query('ROLLBACK');res.status(400).json({error:e.message})}
  finally{client.release()}
});
`;

// Replace the existing approval transaction so an approved purchase is also
// paid from the Cassano vault atomically. If the vault is insufficient, the
// order is NOT approved and stock is NOT deducted.
const approveRoute=`
app.post('/api/orders/:id/approve',auth,need('approve'),async(req,res)=>{
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const o=(await client.query('SELECT * FROM orders WHERE id=$1 FOR UPDATE',[req.params.id])).rows[0];
    if(!o||o.status!=='Pending')throw new Error('Pesanan sudah diproses');
    const its=(await client.query('SELECT * FROM order_items WHERE order_id=$1',[o.id])).rows;
    for(const x of its){
      const i=(await client.query('SELECT * FROM items WHERE id=$1 FOR UPDATE',[x.item_id])).rows[0];
      if(!i||i.stock<x.qty)throw new Error('Stok tidak cukup');
    }
    const vault=(await client.query('SELECT * FROM vault WHERE id=1 FOR UPDATE')).rows[0];
    const balance=Number(vault?.balance||0),total=Number(o.total||0);
    if(balance<total)throw new Error('Saldo brangkas tidak mencukupi untuk pembelian ini. Dibutuhkan Rp '+total.toLocaleString('id-ID')+', saldo Rp '+balance.toLocaleString('id-ID'));
    for(const x of its){
      await client.query('UPDATE items SET stock=stock-$1 WHERE id=$2',[x.qty,x.item_id]);
      await client.query('INSERT INTO movements(item_id,type,qty,user_id,reference) VALUES($1,$2,$3,$4,$5)',[x.item_id,'OUT',x.qty,req.me.id,o.order_no]);
    }
    const next=balance-total;
    await client.query('UPDATE vault SET balance=$1,updated_at=NOW() WHERE id=1',[next]);
    await client.query('INSERT INTO vault_transactions(vault_id,type,amount,balance_after,note,user_id) VALUES(1,$2,$3,$4,$5,$6)',[1,'OUT',total,next,'Pembayaran '+o.order_no,req.me.id]);
    await client.query("UPDATE orders SET status='Approved',approved_by=$1 WHERE id=$2",[req.me.id,o.id]);
    await client.query('COMMIT');
    res.json({ok:true,balance:next,paid:total});
  }catch(e){await client.query('ROLLBACK');res.status(400).json({error:e.message})}
  finally{client.release()}
});
`;

let patched=src;
const initMarker='await pool.query(schema);';
if(!patched.includes(initMarker))throw new Error('Database init marker not found');
patched=patched.replace(initMarker,initMarker+'\n await pool.query(vaultSchema);\n await pool.query(\'INSERT INTO roles(name,description,permissions) VALUES($1,$2,$3) ON CONFLICT(name) DO NOTHING\',[\'Capo\',\'Operasional dan pemantauan\',JSON.stringify([\'dashboard\',\'items\',\'cart\',\'order\',\'orders\',\'history\',\'stock\'])]);');

const approveStart="app.post('/api/orders/:id/approve'";
const rejectStart="app.post('/api/orders/:id/reject'";
const a=patched.indexOf(approveStart),b=patched.indexOf(rejectStart,a);
if(a<0||b<0)throw new Error('Order approval route not found');
patched=patched.slice(0,a)+approveRoute+patched.slice(b);

const routeMarker="app.get('*'";
if(patched.includes(routeMarker))patched=patched.replace(routeMarker,vaultRoutes+routeMarker);
else patched+=vaultRoutes;

const runtime=path.join(__dirname,'.server-runtime.js');
fs.writeFileSync(runtime,patched,'utf8');
require(runtime);
