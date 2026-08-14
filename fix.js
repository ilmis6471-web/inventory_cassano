// Inventory Cassano - robust item editor patch
(function(){
  async function readResponse(r){const text=await r.text();let data={};try{data=text?JSON.parse(text):{}}catch{data={error:text||('HTTP '+r.status)}}if(!r.ok)throw new Error(data.error||('Gagal menyimpan (HTTP '+r.status+')'));return data}
  function compressImage(file){return new Promise((resolve,reject)=>{if(!file){resolve(null);return}if(file.size<=3*1024*1024){resolve(file);return}const img=new Image(),reader=new FileReader();reader.onload=()=>{img.onload=()=>{const max=1400;let w=img.width,h=img.height;if(w>max||h>max){const s=Math.min(max/w,max/h);w=Math.round(w*s);h=Math.round(h*s)}const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);c.toBlob(b=>b?resolve(new File([b],'item-photo.jpg',{type:'image/jpeg'})):reject(new Error('Foto gagal diproses')),'image/jpeg',.82)};img.onerror=()=>reject(new Error('Foto tidak bisa dibaca'));img.src=reader.result};reader.onerror=()=>reject(new Error('Foto tidak bisa dibaca'));reader.readAsDataURL(file)})}
  window.itemModal=async function(id){
    const i=id?items.find(x=>x.id==id):null;
    openM(i?'Edit Barang':'Tambah Barang',`<form id="f" enctype="multipart/form-data">
      <input id="code" placeholder="Kode" value="${i?.code||''}" required>
      <input id="name" placeholder="Nama barang" value="${i?.name||''}" required>
      <select id="cat">${cats.map(c=>`<option value="${c.id}" ${i?.category_id==c.id?'selected':''}>${c.name}</option>`).join('')}</select>
      <input id="price" type="number" min="0" step="0.01" placeholder="Harga" value="${i?.price||0}">
      <input id="stock" type="number" min="0" step="1" placeholder="Stok saat ini" value="${i?.stock||0}" readonly title="Stok hanya diubah melalui menu Stok">
      <small>Stok hanya diubah melalui menu <b>Stok → Stok Masuk</b>. Edit barang tidak akan mengubah stok.</small>
      <input id="photo" type="file" accept="image/*">
      <small id="photoInfo">Pilih foto baru jika ingin mengganti foto barang.</small>
      <img id="prev" class="preview" src="${i?.image||'logo.png'}">
      <textarea id="desc" placeholder="Deskripsi">${i?.description||''}</textarea>
      <div class="modalactions"><button type="button" class="btn" onclick="closeM()">Batal</button><button type="submit" class="primary" id="saveItem">Simpan</button></div>
    </form>`);
    $('photo').onchange=e=>{const f=e.target.files[0];if(f){$('photoInfo').textContent='Foto dipilih: '+f.name+' ('+(f.size/1024/1024).toFixed(2)+' MB)';const r=new FileReader();r.onload=x=>$('prev').src=x.target.result;r.readAsDataURL(f)}};
    $('f').onsubmit=async e=>{e.preventDefault();const btn=$('saveItem');btn.disabled=true;btn.textContent='Menyimpan...';try{const fd=new FormData();fd.append('code',$('code').value.trim());fd.append('name',$('name').value.trim());fd.append('category_id',$('cat').value);fd.append('price',$('price').value||0);fd.append('description',$('desc').value);const file=$('photo').files[0];if(file)fd.append('photo',await compressImage(file));const r=await fetch('/api/items'+(id?'/'+id:''),{method:id?'PUT':'POST',body:fd,credentials:'same-origin'});const data=await readResponse(r);closeM();await refresh();toast(i?'Perubahan barang berhasil disimpan':'Barang berhasil ditambahkan')}catch(err){toast(err.message||'Gagal menyimpan barang');console.error(err)}finally{btn.disabled=false;btn.textContent='Simpan'}};
  };
})();
