let kasState=null,kasFilter={q:'',type:'ALL',category:'ALL'};
async function loadKas(){
 const el=document.getElementById('kas');if(!el)return;
 try{
  kasState=await api('/api/kas');const tx=kasState.transactions||[];
  const cats=[...new Set(tx.map(x=>x.category||'Lainnya'))].sort();
  const filtered=tx.filter(x=>(kasFilter.type==='ALL'||x.type===kasFilter.type)&&(kasFilter.category==='ALL'||(x.category||'Lainnya')===kasFilter.category)&&(!kasFilter.q||[x.user,x.note,x.category].join(' ').toLowerCase().includes(kasFilter.q.toLowerCase())));
  const ins=filtered.filter(x=>x.type==='IN').reduce((a,x)=>a+Number(x.amount||0),0),outs=filtered.filter(x=>x.type==='OUT').reduce((a,x)=>a+Number(x.amount||0),0);
  el.innerHTML=`
   <div class="section"><div><h2>Kas Cassano</h2><small>${kasState.scope==='all'?'Seluruh anggota':'Transaksi kas milik Anda'} • Kas terpisah dari Brangkas</small></div>
   <div style="display:flex;gap:8px;flex-wrap:wrap">${kasState.can_edit?'<button class="primary" onclick="kasModal()">✎ Kelola Kas</button>':''}<button class="btn" onclick="window.location='/api/kas/export'">⇩ Export Excel</button></div></div>
   <div class="vaultHero"><div class="vaultIcon">💵</div><div><small>Saldo Kas</small><strong>${money(kasState.balance)}</strong><span>${kasState.scope==='all'?'Saldo kas bersama':'Saldo kas bersama (riwayat dibatasi ke transaksi Anda)'} • Terakhir diperbarui ${kasState.updated_at?new Date(kasState.updated_at).toLocaleString('id-ID'):'-'}</span></div></div>
   <div class="setStats" style="grid-template-columns:repeat(3,1fr)">
    <div class="setStat"><small>UANG MASUK TERFILTER</small><b>${money(ins)}</b></div>
    <div class="setStat"><small>UANG KELUAR TERFILTER</small><b>${money(outs)}</b></div>
    <div class="setStat"><small>TRANSAKSI</small><b>${filtered.length}</b></div>
   </div>
   <div class="panel vaultPanel">
    <div class="section"><div><h3>Riwayat Kas</h3><small>${kasState.can_edit?'Bos/Consigliere dapat melihat seluruh transaksi semua member. Member biasa hanya melihat transaksi miliknya.':'Riwayat transaksi milik Anda.'}</small></div></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
      <input id="kasSearch" placeholder="Cari member / catatan..." value="${esc(kasFilter.q)}" style="flex:1;min-width:180px">
      <select id="kasType"><option value="ALL">Semua jenis</option><option value="IN" ${kasFilter.type==='IN'?'selected':''}>Masuk</option><option value="OUT" ${kasFilter.type==='OUT'?'selected':''}>Keluar</option></select>
      <select id="kasCat"><option value="ALL">Semua kategori</option>${cats.map(c=>'<option value="'+esc(c)+'" '+(kasFilter.category===c?'selected':'')+'>'+esc(c)+'</option>').join('')}</select>
    </div>
    ${filtered.length?'<div style="overflow:auto"><table><thead><tr><th>Tanggal</th><th>Member / Petugas</th><th>Jenis</th><th>Nominal</th><th>Saldo Setelah</th><th>Kategori</th><th>Catatan</th></tr></thead><tbody>'+filtered.map(x=>'<tr><td>'+new Date(x.created_at).toLocaleString('id-ID')+'</td><td>'+esc(x.user||'-')+'</td><td><span class="vaultBadge '+x.type+'">'+(x.type==='IN'?'MASUK':'KELUAR')+'</span></td><td>'+money(x.amount)+'</td><td>'+money(x.balance_after)+'</td><td>'+esc(x.category||'Lainnya')+'</td><td>'+esc(x.note||'-')+'</td></tr>').join('')+'</tbody></table></div>':'<div class="empty">Tidak ada transaksi yang cocok dengan filter.</div>'}
   </div>`;
  document.getElementById('kasSearch').oninput=e=>{kasFilter.q=e.target.value;loadKas()};document.getElementById('kasType').onchange=e=>{kasFilter.type=e.target.value;loadKas()};document.getElementById('kasCat').onchange=e=>{kasFilter.category=e.target.value;loadKas()};
 }catch(e){el.innerHTML='<div class="panel"><b>Gagal memuat Kas</b><p>'+esc(e.message)+'</p></div>'}
}
function kasModal(){
 openM('Kelola Kas',`<form id="kf"><div class="vaultChoice"><label><input type="radio" name="kt" value="IN" checked> Uang Masuk</label><label><input type="radio" name="kt" value="OUT"> Uang Keluar</label></div><select id="kc"><option>Setoran Kas</option><option>Operasional</option><option>Pembelian</option><option>Transport</option><option>Konsumsi</option><option>Bonus</option><option>Lainnya</option></select><input id="ka" type="number" min="1" step="1" placeholder="Nominal, contoh 500000" required><textarea id="kn" placeholder="Catatan transaksi"></textarea><div class="modalactions"><button type="button" class="btn" onclick="closeM()">Batal</button><button class="primary">Simpan Transaksi</button></div></form>`);
 document.getElementById('kf').onsubmit=async e=>{e.preventDefault();try{await api('/api/kas/adjust',{method:'POST',body:JSON.stringify({type:document.querySelector('input[name="kt"]:checked').value,amount:document.getElementById('ka').value,category:document.getElementById('kc').value,note:document.getElementById('kn').value})});closeM();loadKas();toast('Kas diperbarui')}catch(err){toast(err.message)}}
}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
