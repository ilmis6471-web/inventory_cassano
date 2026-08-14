const fs=require('fs');
const path=require('path');
const src=fs.readFileSync(path.join(__dirname,'server.js'),'utf8');
const fixed="app.put('/api/items/:id',auth,need('items_manage'),upload.single('photo'),async(req,res)=>{try{const old=await one('SELECT * FROM items WHERE id=$1',[req.params.id]);if(!old)return res.status(404).json({error:'Barang tidak ditemukan'});const b=req.body;await run('UPDATE items SET code=$1,name=$2,category_id=$3,price=$4,description=$5,image=$6 WHERE id=$7',[b.code,b.name,b.category_id||null,+b.price||0,b.description||'',imageData(req)||old.image||null,req.params.id]);res.json({ok:true,stock:old.stock})}catch(e){res.status(400).json({error:e.message})}});\n";
const patched=src.replace(/app\.put\('\/api\/items\/:id'[\s\S]*?\napp\.delete/,fixed+'app.delete');
if(patched===src) throw new Error('Stock route patch target not found');
const runtime=path.join(__dirname,'.server-runtime.js');
fs.writeFileSync(runtime,patched,'utf8');
require(runtime);
