
const express=require("express"), path=require("path"), fs=require("fs");
const Database=require("better-sqlite3"), bcrypt=require("bcryptjs"), session=require("express-session"), multer=require("multer");
const app=express(), PORT=process.env.PORT||3000;
const dataDir=path.join(__dirname,"data"), uploadDir=path.join(__dirname,"uploads");
fs.mkdirSync(dataDir,{recursive:true});fs.mkdirSync(uploadDir,{recursive:true});
const db=new Database(path.join(dataDir,"cassano.db")); db.pragma("journal_mode=WAL");
db.exec(`
CREATE TABLE IF NOT EXISTS roles(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT UNIQUE,description TEXT,permissions TEXT);
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT,email TEXT UNIQUE,password TEXT,role_id INTEGER,active INTEGER DEFAULT 1);
CREATE TABLE IF NOT EXISTS categories(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT UNIQUE);
CREATE TABLE IF NOT EXISTS items(id INTEGER PRIMARY KEY AUTOINCREMENT,code TEXT UNIQUE,name TEXT,category_id INTEGER,price REAL DEFAULT 0,stock INTEGER DEFAULT 0,description TEXT,image TEXT);
CREATE TABLE IF NOT EXISTS cart(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER,item_id INTEGER,qty INTEGER,UNIQUE(user_id,item_id));
CREATE TABLE IF NOT EXISTS orders(id INTEGER PRIMARY KEY AUTOINCREMENT,order_no TEXT UNIQUE,user_id INTEGER,status TEXT,total REAL,approved_by INTEGER,created_at TEXT);
CREATE TABLE IF NOT EXISTS order_items(id INTEGER PRIMARY KEY AUTOINCREMENT,order_id INTEGER,item_id INTEGER,qty INTEGER,price REAL);
CREATE TABLE IF NOT EXISTS movements(id INTEGER PRIMARY KEY AUTOINCREMENT,item_id INTEGER,type TEXT,qty INTEGER,user_id INTEGER,reference TEXT,note TEXT,created_at TEXT);
`);
const perms=["dashboard","items","items_manage","cart","order","orders","approve","history","stock","roles","users","roles_manage"];
function seed(){
 if(!db.prepare("SELECT id FROM roles LIMIT 1").get()){
  const add=db.prepare("INSERT INTO roles(name,description,permissions) VALUES(?,?,?)");
  add.run("Bos","Akses penuh",JSON.stringify(perms));
  add.run("Consigliere","Inventory dan approval",JSON.stringify(["dashboard","items","items_manage","cart","order","orders","approve","history","stock"]));
  add.run("Fixer","Membuat pesanan",JSON.stringify(["dashboard","items","cart","order","history"]));
 }
 ["Dokumen","Elektronik","Akses","Operasional"].forEach(x=>db.prepare("INSERT OR IGNORE INTO categories(name) VALUES(?)").run(x));
 if(!db.prepare("SELECT id FROM users LIMIT 1").get()){
  const bos=db.prepare("SELECT id FROM roles WHERE name='Bos'").get().id;
  db.prepare("INSERT INTO users(name,email,password,role_id) VALUES(?,?,?,?)").run("Bos Cassano","bos@cassano.local",bcrypt.hashSync("bos123",10),bos);
  const cat=db.prepare("SELECT id FROM categories WHERE name=?").get("Dokumen").id;
  db.prepare("INSERT OR IGNORE INTO items(code,name,category_id,price,stock,description) VALUES(?,?,?,?,?,?)").run("BRG-001","Dokumen Kontrak",cat,150000,12,"Dokumen operasional");
 }
}
seed();

app.use(express.json({limit:"10mb"}));app.use(express.urlencoded({extended:true}));
app.use(session({secret:process.env.SESSION_SECRET||"cassano-local-secret-change-if-public",resave:false,saveUninitialized:false,cookie:{httpOnly:true,sameSite:"lax"}}));
app.use("/uploads",express.static(uploadDir)); app.use(express.static(__dirname));

const upload=multer({storage:multer.diskStorage({destination:uploadDir,filename:(r,f,cb)=>cb(null,Date.now()+"-"+Math.random().toString(36).slice(2)+path.extname(f.originalname))}),limits:{fileSize:5*1024*1024}});
function me(req){return req.session.user?db.prepare("SELECT u.*,r.name role,r.permissions FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=?").get(req.session.user.id):null}
function auth(req,res,next){const u=me(req);if(!u)return res.status(401).json({error:"Belum login"});if(!u.active)return res.status(403).json({error:"Akun nonaktif"});req.me=u;next()}
function has(u,p){return JSON.parse(u.permissions||"[]").includes(p)}
function need(p){return (req,res,next)=>{if(!has(req.me,p))return res.status(403).json({error:"Role tidak memiliki akses: "+p});next()}}
const q=(sql,...a)=>db.prepare(sql).all(...a), one=(sql,...a)=>db.prepare(sql).get(...a), run=(sql,...a)=>db.prepare(sql).run(...a);

app.post("/api/login",(req,res)=>{let u=one("SELECT * FROM users WHERE email=?",[req.body.email]);if(!u||!bcrypt.compareSync(req.body.password,u.password))return res.status(401).json({error:"Email atau password salah"});if(!u.active)return res.status(403).json({error:"Akun nonaktif"});req.session.user={id:u.id};res.json({ok:true})});
app.post("/api/logout",(req,res)=>req.session.destroy(()=>res.json({ok:true})));
app.get("/health",(req,res)=>res.json({ok:true,service:"inventory-cassano"}));
app.get("/api/me",auth,(req,res)=>res.json({id:req.me.id,name:req.me.name,email:req.me.email,role:req.me.role,permissions:JSON.parse(req.me.permissions)}));

app.get("/api/items",auth,(req,res)=>res.json(q("SELECT i.*,c.name category FROM items i LEFT JOIN categories c ON c.id=i.category_id ORDER BY i.id DESC")));
app.get("/api/categories",auth,(req,res)=>res.json(q("SELECT * FROM categories ORDER BY name")));
app.post("/api/items",auth,need("items_manage"),upload.single("photo"),(req,res)=>{let b=req.body,image=req.file?"/uploads/"+req.file.filename:null;let r=run("INSERT INTO items(code,name,category_id,price,stock,description,image) VALUES(?,?,?,?,?,?,?)",b.code,b.name,b.category_id||null,+b.price||0,+b.stock||0,b.description||"",image);res.json({id:r.lastInsertRowid})});
app.put("/api/items/:id",auth,need("items_manage"),upload.single("photo"),(req,res)=>{let old=one("SELECT image FROM items WHERE id=?",[req.params.id]);let image=req.file?"/uploads/"+req.file.filename:(old?.image||null);let b=req.body;run("UPDATE items SET code=?,name=?,category_id=?,price=?,stock=?,description=?,image=? WHERE id=?",b.code,b.name,b.category_id||null,+b.price||0,+b.stock||0,b.description||"",image,req.params.id);res.json({ok:true})});
app.delete("/api/items/:id",auth,need("items_manage"),(req,res)=>{run("DELETE FROM items WHERE id=?",req.params.id);res.json({ok:true})});

app.get("/api/cart",auth,(req,res)=>res.json(q("SELECT c.*,i.name,i.price,i.stock,i.image FROM cart c JOIN items i ON i.id=c.item_id WHERE c.user_id=?",req.me.id)));
app.post("/api/cart",auth,need("order"),(req,res)=>{let old=one("SELECT * FROM cart WHERE user_id=? AND item_id=?",req.me.id,req.body.item_id);if(old)run("UPDATE cart SET qty=? WHERE id=?",old.qty+(+req.body.qty||1),old.id);else run("INSERT INTO cart(user_id,item_id,qty) VALUES(?,?,?)",req.me.id,req.body.item_id,+req.body.qty||1);res.json({ok:true})});
app.put("/api/cart/:id",auth,need("order"),(req,res)=>{if(+req.body.qty<=0)run("DELETE FROM cart WHERE id=? AND user_id=?",req.params.id,req.me.id);else run("UPDATE cart SET qty=? WHERE id=? AND user_id=?",+req.body.qty,req.params.id,req.me.id);res.json({ok:true})});

app.post("/api/orders",auth,need("order"),(req,res)=>{
 const cart=q("SELECT c.*,i.name,i.price,i.stock FROM cart c JOIN items i ON i.id=c.item_id WHERE c.user_id=?",req.me.id);
 if(!cart.length)return res.status(400).json({error:"Keranjang kosong"});
 for(const x of cart)if(x.qty>x.stock)return res.status(400).json({error:"Stok "+x.name+" tidak cukup"});
 const total=cart.reduce((s,x)=>s+x.qty*x.price,0), no="ORD-"+Date.now().toString(36).toUpperCase();
 const tx=db.transaction(()=>{let r=run("INSERT INTO orders(order_no,user_id,status,total,created_at) VALUES(?,?,?,?,datetime('now'))",no,req.me.id,"Pending",total);for(const x of cart)run("INSERT INTO order_items(order_id,item_id,qty,price) VALUES(?,?,?,?)",r.lastInsertRowid,x.item_id,x.qty,x.price);run("DELETE FROM cart WHERE user_id=?",req.me.id);});
 tx();res.json({ok:true,order_no:no})
});
function orderList(){return q(`SELECT o.*,u.name requester,a.name approver,
 (SELECT GROUP_CONCAT(i.name||' × '||oi.qty, ', ') FROM order_items oi JOIN items i ON i.id=oi.item_id WHERE oi.order_id=o.id) details
 FROM orders o JOIN users u ON u.id=o.user_id LEFT JOIN users a ON a.id=o.approved_by ORDER BY o.id DESC`)}
app.get("/api/orders",auth,(req,res)=>res.json(orderList().filter(o=>has(req.me,"orders")||o.user_id===req.me.id)));
app.post("/api/orders/:id/approve",auth,need("approve"),(req,res)=>{
 let o=one("SELECT * FROM orders WHERE id=?",req.params.id);if(!o||o.status!=="Pending")return res.status(400).json({error:"Pesanan sudah diproses"});
 const its=q("SELECT * FROM order_items WHERE order_id=?",o.id);for(const x of its){let i=one("SELECT * FROM items WHERE id=?",x.item_id);if(!i||i.stock<x.qty)return res.status(400).json({error:"Stok tidak cukup"});}
 const tx=db.transaction(()=>{for(const x of its){run("UPDATE items SET stock=stock-? WHERE id=?",x.qty,x.item_id);run("INSERT INTO movements(item_id,type,qty,user_id,reference,created_at) VALUES(?,?,?,?,?,datetime('now'))",x.item_id,"OUT",x.qty,req.me.id,o.order_no)}run("UPDATE orders SET status='Approved',approved_by=? WHERE id=?",req.me.id,o.id)});tx();res.json({ok:true})
});
app.post("/api/orders/:id/reject",auth,need("approve"),(req,res)=>{run("UPDATE orders SET status='Rejected',approved_by=? WHERE id=? AND status='Pending'",req.me.id,req.params.id);res.json({ok:true})});

app.get("/api/movements",auth,need("stock"),(req,res)=>res.json(q("SELECT m.*,i.name item,u.name user FROM movements m JOIN items i ON i.id=m.item_id LEFT JOIN users u ON u.id=m.user_id ORDER BY m.id DESC")));
app.post("/api/stock-in",auth,need("stock"),(req,res)=>{let n=+req.body.qty;if(n<=0)return res.status(400).json({error:"Jumlah tidak valid"});run("UPDATE items SET stock=stock+? WHERE id=?",n,req.body.item_id);run("INSERT INTO movements(item_id,type,qty,user_id,note,created_at) VALUES(?,?,?,?,?,datetime('now'))",req.body.item_id,"IN",n,req.me.id,req.body.note||"");res.json({ok:true})});

app.get("/api/roles",auth,need("roles"),(req,res)=>res.json(q("SELECT * FROM roles ORDER BY id")));
app.post("/api/roles",auth,need("roles_manage"),(req,res)=>{try{run("INSERT INTO roles(name,description,permissions) VALUES(?,?,?)",req.body.name,req.body.description||"",JSON.stringify(req.body.permissions||[]));res.json({ok:true})}catch(e){res.status(400).json({error:"Nama role sudah digunakan"})}});
app.put("/api/roles/:id",auth,need("roles_manage"),(req,res)=>{run("UPDATE roles SET name=?,description=?,permissions=? WHERE id=?",req.body.name,req.body.description||"",JSON.stringify(req.body.permissions||[]),req.params.id);res.json({ok:true})});
app.get("/api/users",auth,need("users"),(req,res)=>res.json(q("SELECT u.id,u.name,u.email,u.active,r.name role,u.role_id FROM users u JOIN roles r ON r.id=u.role_id ORDER BY u.id DESC")));
app.post("/api/users",auth,need("users"),(req,res)=>{try{let pass=req.body.password||"cassano123";run("INSERT INTO users(name,email,password,role_id) VALUES(?,?,?,?)",req.body.name,req.body.email,bcrypt.hashSync(pass,10),req.body.role_id);res.json({ok:true,temporary_password:pass})}catch(e){res.status(400).json({error:"Email sudah digunakan"})}});
app.put("/api/users/:id",auth,need("users"),(req,res)=>{run("UPDATE users SET name=?,role_id=?,active=? WHERE id=?",req.body.name,req.body.role_id,+req.body.active?1:0,req.params.id);res.json({ok:true})});
app.get("/api/dashboard",auth,(req,res)=>{res.json({items:one("SELECT COUNT(*) n FROM items").n,stock:one("SELECT COALESCE(SUM(stock),0) n FROM items").n,pending:one("SELECT COUNT(*) n FROM orders WHERE status='Pending'").n,approved:one("SELECT COUNT(*) n FROM orders WHERE status='Approved'").n})});

app.get("*",(req,res)=>res.sendFile(path.join(__dirname,"index.html")));
app.listen(PORT,()=>console.log("Inventory Cassano running on port "+PORT));
