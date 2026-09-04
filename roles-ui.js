// Cassano Role & Permission UI
(function(){
  const labels={dashboard:'Dashboard',items:'Lihat Barang',items_manage:'Kelola Barang',cart:'Keranjang',order:'Buat Pesanan',orders:'Lihat Semua Pesanan',approve:'Approval Pesanan',history:'Riwayat',stock:'Kelola Stok',roles:'Lihat Role',users:'Kelola User',roles_manage:'Kelola Role & Permission'};
  window.roleModal=function(id){
    const r=id?roles.find(x=>Number(x.id)===Number(id)):null;
    const selected= r ? (Array.isArray(r.permissions)?r.permissions:JSON.parse(r.permissions||'[]')) : [];
    openM(r?'Edit Role':'Buat Role',`<form id="roleForm"><input id="roleName" placeholder="Nama role" value="${String(r?.name||'').replace(/"/g,'&quot;')}" required><textarea id="roleDesc" placeholder="Deskripsi role">${r?.description||''}</textarea><h4 style="margin:14px 0 8px">Permission</h4><div class="permGrid">${Object.entries(labels).map(([p,label])=>`<label style="display:flex;gap:8px;align-items:center;padding:9px;border:1px solid #30333b;border-radius:8px"><input type="checkbox" class="rolePerm" value="${p}" ${selected.includes(p)?'checked':''}> <span>${label}</span></label>`).join('')}</div><div class="modalactions"><button type="button" class="btn" onclick="closeM()">Batal</button><button class="primary">Simpan</button></div></form>`);
    $('roleForm').onsubmit=async e=>{e.preventDefault();const permissions=[...document.querySelectorAll('.rolePerm:checked')].map(x=>x.value);try{await api('/api/roles'+(r?'/'+r.id:''),{method:r?'PUT':'POST',body:JSON.stringify({name:$('roleName').value.trim(),description:$('roleDesc').value.trim(),permissions})});closeM();roles=await api('/api/roles');render('roles');toast(r?'Role berhasil diperbarui':'Role berhasil dibuat')}catch(e){toast(e.message)}};
  };
  const old=window.rolesPage;
  window.rolesPage=function(){
    if(!Array.isArray(roles))roles=[];
    $('roles').innerHTML=`<div class="section"><div><h2>Role & Permission</h2><small>Atur hak akses setiap jabatan Cassano.</small></div>${allow('roles_manage')?'<button class="primary" onclick="roleModal()">+ Buat Role</button>':''}</div><div class="grid">${roles.map(r=>{const ps=Array.isArray(r.permissions)?r.permissions:JSON.parse(r.permissions||'[]');return `<div class="card"><div style="display:flex;justify-content:space-between;gap:10px"><div><h3>${r.name}</h3><p>${r.description||''}</p></div>${allow('roles_manage')?`<button class="btn" onclick="roleModal(${r.id})">Edit</button>`:''}</div><div style="display:flex;flex-wrap:wrap;gap:6px">${ps.map(p=>`<span class="perm">${labels[p]||p}</span>`).join('')||'<small>Belum ada permission</small>'}</div></div>`}).join('')}</div>`;
  };
})();
