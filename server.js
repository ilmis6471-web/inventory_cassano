const express=require('express');
const path=require('path');
const bcrypt=require('bcryptjs');
const session=require('express-session');
const multer=require('multer');
const {Pool}=require('pg');

const app=express();
const PORT=process.env.PORT||3000;
const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_URL?{rejectUnauthorized:false}:false,max:5});
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:5*1024*1024}});

const perms=["dashboard","items","items_manage","cart","order","orders","approve","history","stock","roles","users","roles_manage"];
const schema=`
CREATE TABLE IF NOT EXISTS roles(id SERIAL PRIMARY KEY,name TEXT UNIQUE NOT NULL,description TEXT DEFAULT '',permissions JSONB NOT NULL DEFAULT '[]');
CREATE TABLE IF NOT EXISTS users(id SERIAL PRIMARY KEY,name TEXT NOT NULL,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL,role_id INTEGER REFERENCES roles(id),active BOOLEAN NOT NULL DEFAULT TRUE);
CREATE TABLE IF NOT EXISTS categories(id SERIAL PRIMARY KEY,name TEXT UNIQUE NOT NULL);
CREATE TABLE IF NOT EXISTS items(id SERIAL PRIMARY KEY,code TEXT UNIQUE NOT NULL,name TEXT NOT NULL,category_id INTEGER REFERENCES categories(id),price NUMERIC(14,2) DEFAULT 0,stock INTEGER DEFAULT 0,description TEXT DEFAULT '',image TEXT);
CREATE TABLE IF NOT EXISTS cart(id SERIAL PRIMARY KEY,user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,item_id INTEGER REFERENCES items(id) ON DELETE CASCADE,qty INTEGER NOT NULL,UNIQUE(user_id,item_id));
CREATE TABLE IF NOT EXISTS orders(id SERIAL PRIMARY KEY,order_no TEXT UNIQUE NOT NULL,user_id INTEGER REFERENCES users(id),status TEXT NOT NULL,total NUMERIC(14,2),approved_by INTEGER REFERENCES users(id),created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS order_items(id SERIAL PRIMARY KEY,order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,item_id INTEGER REFERENCES items(id),qty INTEGER NOT NULL,price NUMERIC(14,2) NOT NULL);
CREATE TABLE IF NOT EXISTS movements(id SERIAL PRIMARY KEY,item_id INTEGER REFERENCES items(id),type TEXT NOT NULL,qty INTEGER NOT NULL,user_id INTEGER REFERENCES users(id),reference TEXT,note TEXT,created_at TIMESTAMPTZ DEFAULT NOW());
`;
async function q(sql,params=[]){return (await pool.query(sql,params)).rows}
async function one(sql,params=[]){return (await pool.query(sql,params)).rows[0]}
async function run(sql,params=[]){return pool.query(sql,params)}
async function init(){
 await pool.query(schema);
 if(!(await one('SELECT id FROM roles LIMIT 1'))){
  for(const [name,description,permissions] of [["Bos","Akses penuh",perms],["Consigliere","Inventory dan approval",["dashboard","items","items_manage","cart","order","orders","approve","history","stock"]],["Fixer","Membuat pesanan",["dashboard","items","cart","order","history"]]]) await run('INSERT INTO roles(name,description,permissions) VALUES($1,$2,$3)',[name,description,JSON.stringify(permissions)]);
 }
 for(const x of ["Dokumen","Elektronik","Akses","Operasional"]) await run('INSERT INTO categories(name) VALUES($1) ON CONFLICT(name) DO NOTHING',[x]);
 if(!(await one('SELECT id FROM users LIMIT 1'))){const bos=(await one("SELECT id FROM roles WHERE name='Bos'"))?.id;await run('INSERT INTO users(name,email,password,role_id) VALUES($1,$2,$3,$4)',["Bos Cassano","bos@cassano.local",bcrypt.hashSync("bos123",10),bos]);const cat=(await one("SELECT id FROM categories WHERE name='Dokumen'"))?.id;await run('INSERT INTO items(code,name,category_id,price,stock,description) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(code) DO NOTHING',["BRG-001","Dokumen Kontrak",cat,150000,12,"Dokumen operasional"])}
}
app.use(express.json({limit:'10mb'}));app.use(express.urlencoded({extended:true}));
app.use(session({secret:process.env.SESSION_SECRET||'CHANGE_ME',resave:false,saveUninitialized:false,cookie:{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production'}}));
app.use(express.static(__dirname));
const imageData=req=>req.file?`data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`:null;
async function me(req){if(!req.session.user)return null;return one('SELECT u.*,r.name role,r.permissions FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=$1',[req.session.user.id])}
async function auth(req,res,next){try{const u=await me(req);if(!u)return res.status(401).json({error:'Belum login'});if(!u.active)return res.status(403).json({error:'Akun nonaktif'});req.me=u;next()}catch(e){res.status(500).json({error:e.message})}}
function has(u,p){return Array.isArray(u.permissions)?u.permissions.includes(p):JSON.parse(u.permissions||'[]').includes(p)}
function need(p){return (req,res,next)=>{if(!has(req.me,p))return res.status(403).json({error:'Role tidak memiliki akses: '+p});next()}}

app.post('/api/login',async(req,res)=>{try{const u=await one('SELECT * FROM users WHERE email=$1',[req.body.email]);if(!u||!bcrypt.compareSync(req.body.password,u.password))return res.status(401).json({error:'Email atau password salah'});if(!u.active)return res.status(403).json({error:'Akun nonaktif'});req.session.user={id:u.id};res.json({ok:true})}catch(e){res.status(500).json({error:e.message})}});
app.post('/api/logout',(req,res)=>req.session.destroy(()=>res.json({ok:true})));
app.get('/health',(req,res)=>res.json({ok:true,service:'inventory-cassano',database:'postgresql'}));
app.get('/api/me',auth,async(req,res)=>res.json({id:req.me.id,name:req.me.name,email:req.me.email,role:req.me.role,permissions:req.me.permissions}));
app.get('/api/items',auth,async(req,res)=>res.json(await q('SELECT i.*,c.name category FROM items i LEFT JOIN categories c ON c.id=i.category_id ORDER BY i.id DESC')));
app.get('/api/categories',auth,async(req,res)=>res.json(await q('SELECT * FROM categories ORDER BY name')));
app.post('/api/items',auth,need('items_manage'),upload.single('photo'),async(req,res)=>{try{const b=req.body;const r=await one('INSERT INTO items(code,name,category_id,price,stock,description,image) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id',[b.code,b.name,b.category_id||null,+b.price||0,+b.stock||0,b.description||'',imageData(req)]);res.json({id:r.id})}catch(e){res.status(400).json({error:e.message})}});
app.put('/api/items/:id',auth,need('items_manage'),upload.single('photo'),async(req,res)=>{try{const old=await one('SELECT image FROM items WHERE id=$1',[req.params.id]);const b=req.body;await run('UPDATE items SET code=$1,name=$2,category_id=$3,price=$4,stock=$5,description=$6,image=$7 WHERE id=$8',[b.code,b.name,b.category_id||null,+b.price||0,+b.stock||0,b.description||'',imageData(req)||old?.image||null,req.params.id]);res.json({ok:true})}catch(e){res.status(400).json({error:e.message})}});
app.delete('/api/items/:id',auth,need('items_manage'),async(req,res)=>{await run('DELETE FROM items WHERE id=$1',[req.params.id]);res.json({ok:true})});
app.get('/api/cart',auth,async(req,res)=>res.json(await q('SELECT c.*,i.name,i.price,i.stock,i.image FROM cart c JOIN items i ON i.id=c.item_id WHERE c.user_id=$1',[req.me.id])));
app.post('/api/cart',auth,need('order'),async(req,res)=>{const old=await one('SELECT * FROM cart WHERE user_id=$1 AND item_id=$2',[req.me.id,req.body.item_id]);if(old)await run('UPDATE cart SET qty=$1 WHERE id=$2',[old.qty+(+req.body.qty||1),old.id]);else await run('INSERT INTO cart(user_id,item_id,qty) VALUES($1,$2,$3)',[req.me.id,req.body.item_id,+req.body.qty||1]);res.json({ok:true})});
app.put('/api/cart/:id',auth,need('order'),async(req,res)=>{if(+req.body.qty<=0)await run('DELETE FROM cart WHERE id=$1 AND user_id=$2',[req.params.id,req.me.id]);else await run('UPDATE cart SET qty=$1 WHERE id=$2 AND user_id=$3',[+req.body.qty,req.params.id,req.me.id]);res.json({ok:true})});
app.post('/api/orders',auth,need('order'),async(req,res)=>{const client=await pool.connect();try{await client.query('BEGIN');const cart=(await client.query('SELECT c.*,i.name,i.price,i.stock FROM cart c JOIN items i ON i.id=c.item_id WHERE c.user_id=$1 FOR UPDATE',[req.me.id])).rows;if(!cart.length)throw new Error('Keranjang kosong');for(const x of cart)if(x.qty>x.stock)throw new Error('Stok '+x.name+' tidak cukup');const total=cart.reduce((s,x)=>s+x.qty*Number(x.price),0);const no='ORD-'+Date.now().toString(36).toUpperCase();const o=(await client.query('INSERT INTO orders(order_no,user_id,status,total) VALUES($1,$2,$3,$4) RETURNING id',[no,req.me.id,'Pending',total])).rows[0];for(const x of cart)await client.query('INSERT INTO order_items(order_id,item_id,qty,price) VALUES($1,$2,$3,$4)',[o.id,x.item_id,x.qty,x.price]);await client.query('DELETE FROM cart WHERE user_id=$1',[req.me.id]);await client.query('COMMIT');res.json({ok:true,order_no:no})}catch(e){await client.query('ROLLBACK');res.status(400).json({error:e.message})}finally{client.release()}});
async function orderList(){return q(`SELECT o.*,u.name requester,a.name approver,COALESCE((SELECT string_agg(i.name||' × '||oi.qty, ', ') FROM order_items oi JOIN items i ON i.id=oi.item_id WHERE oi.order_id=o.id),'') details FROM orders o JOIN users u ON u.id=o.user_id LEFT JOIN users a ON a.id=o.approved_by ORDER BY o.id DESC`)}
app.get('/api/orders',auth,async(req,res)=>{const rows=await orderList();res.json(rows.filter(o=>has(req.me,'orders')||o.user_id===req.me.id))});
app.post('/api/orders/:id/approve',auth,need('approve'),async(req,res)=>{const client=await pool.connect();try{await client.query('BEGIN');const o=(await client.query('SELECT * FROM orders WHERE id=$1 FOR UPDATE',[req.params.id])).rows[0];if(!o||o.status!=='Pending')throw new Error('Pesanan sudah diproses');const its=(await client.query('SELECT * FROM order_items WHERE order_id=$1',[o.id])).rows;for(const x of its){const i=(await client.query('SELECT * FROM items WHERE id=$1 FOR UPDATE',[x.item_id])).rows[0];if(!i||i.stock<x.qty)throw new Error('Stok tidak cukup')}for(const x of its){await client.query('UPDATE items SET stock=stock-$1 WHERE id=$2',[x.qty,x.item_id]);await client.query('INSERT INTO movements(item_id,type,qty,user_id,reference) VALUES($1,$2,$3,$4,$5)',[x.item_id,'OUT',x.qty,req.me.id,o.order_no])}await client.query("UPDATE orders SET status='Approved',approved_by=$1 WHERE id=$2",[req.me.id,o.id]);await client.query('COMMIT');res.json({ok:true})}catch(e){await client.query('ROLLBACK');res.status(400).json({error:e.message})}finally{client.release()}});
app.post('/api/orders/:id/reject',auth,need('approve'),async(req,res)=>{await run("UPDATE orders SET status='Rejected',approved_by=$1 WHERE id=$2 AND status='Pending'",[req.me.id,req.params.id]);res.json({ok:true})});
app.get('/api/movements',auth,need('stock'),async(req,res)=>res.json(await q('SELECT m.*,i.name item,u.name user FROM movements m JOIN items i ON i.id=m.item_id LEFT JOIN users u ON u.id=m.user_id ORDER BY m.id DESC')));
app.post('/api/stock-in',auth,need('stock'),async(req,res)=>{const n=+req.body.qty;if(n<=0)return res.status(400).json({error:'Jumlah tidak valid'});await run('UPDATE items SET stock=stock+$1 WHERE id=$2',[n,req.body.item_id]);await run('INSERT INTO movements(item_id,type,qty,user_id,note) VALUES($1,$2,$3,$4,$5)',[req.body.item_id,'IN',n,req.me.id,req.body.note||'']);res.json({ok:true})});
app.get('/api/roles',auth,need('roles'),async(req,res)=>res.json(await q('SELECT * FROM roles ORDER BY id')));
app.post('/api/roles',auth,need('roles_manage'),async(req,res)=>{try{await run('INSERT INTO roles(name,description,permissions) VALUES($1,$2,$3)',[req.body.name,req.body.description||'',JSON.stringify(req.body.permissions||[])]);res.json({ok:true})}catch(e){res.status(400).json({error:'Nama role sudah digunakan'})}});
app.put('/api/roles/:id',auth,need('roles_manage'),async(req,res)=>{await run('UPDATE roles SET name=$1,description=$2,permissions=$3 WHERE id=$4',[req.body.name,req.body.description||'',JSON.stringify(req.body.permissions||[]),req.params.id]);res.json({ok:true})});
app.get('/api/users',auth,need('users'),async(req,res)=>res.json(await q('SELECT u.id,u.name,u.email,u.active,r.name role,u.role_id FROM users u JOIN roles r ON r.id=u.role_id ORDER BY u.id DESC')));
app.post('/api/users',auth,need('users'),async(req,res)=>{try{const pass=req.body.password||'cassano123';await run('INSERT INTO users(name,email,password,role_id) VALUES($1,$2,$3,$4)',[req.body.name,req.body.email,bcrypt.hashSync(pass,10),req.body.role_id]);res.json({ok:true,temporary_password:pass})}catch(e){res.status(400).json({error:'Email sudah digunakan'})}});
app.put('/api/users/:id',auth,need('users'),async(req,res)=>{await run('UPDATE users SET name=$1,role_id=$2,active=$3 WHERE id=$4',[req.body.name,req.body.role_id,!!+req.body.active,req.params.id]);res.json({ok:true})});
app.get('/api/dashboard',auth,async(req,res)=>res.json({items:(await one('SELECT COUNT(*)::int n FROM items')).n,stock:(await one('SELECT COALESCE(SUM(stock),0)::int n FROM items')).n,pending:(await one("SELECT COUNT(*)::int n FROM orders WHERE status='Pending'")).n,approved:(await one("SELECT COUNT(*)::int n FROM orders WHERE status='Approved'")).n}));
app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'index.html')));

init().then(()=>app.listen(PORT,()=>console.log('Inventory Cassano running on port '+PORT))).catch(e=>{console.error(e);process.exit(1)});
