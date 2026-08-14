const fs=require('fs');
const path=require('path');
const src=fs.readFileSync(path.join(__dirname,'server.js'),'utf8');

// server.js already contains the stock-edit protection. This wrapper only adds
// the persistent Cassano vault routes and schema, without changing the server's
// existing stock/order logic.
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
  const amount=Number(req.body.amount);
  const type=req.body.type;
  const note=(req.body.note||'').trim();
  if(!Number.isFinite(amount)||amount<=0)return res.status(400).json({error:'Nominal tidak valid'});
  if(!['IN','OUT'].includes(type))return res.status(400).json({error:'Jenis transaksi tidak valid'});
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const v=(await client.query('SELECT * FROM vault WHERE id=1 FOR UPDATE')).rows[0];
    const current=Number(v.balance||0);
    const next=type==='IN'?current+amount:current-amount;
    if(next<0)throw new Error('Saldo brangkas tidak mencukupi');
    await client.query('UPDATE vault SET balance=$1,updated_at=NOW() WHERE id=1',[next]);
    await client.query('INSERT INTO vault_transactions(vault_id,type,amount,balance_after,note,user_id) VALUES(1,$1,$2,$3,$4,$5)',[type,amount,next,note,req.me.id]);
    await client.query('COMMIT');
    res.json({ok:true,balance:next});
  }catch(e){
    await client.query('ROLLBACK');
    res.status(400).json({error:e.message});
  }finally{client.release()}
});
`;

let patched=src;
const initMarker='await pool.query(schema);';
if(!patched.includes(initMarker))throw new Error('Database init marker not found');
patched=patched.replace(initMarker,initMarker+'\n await pool.query(vaultSchema);');
patched=patched.replace("app.get('*'",vaultRoutes+"app.get('*'");
if(patched===src)throw new Error('Brangkas route injection failed');

const runtime=path.join(__dirname,'.server-runtime.js');
fs.writeFileSync(runtime,patched,'utf8');
require(runtime);
