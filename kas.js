let kasState=null;
async function loadKas(){
  const el=document.getElementById('kas');if(!el)return;
  try{kasState=await api('/api/kas');const tx=kasState.transactions||[];
    el.innerHTML=`
      <div class="section"><div><h2>Kas Cassano</h2><small>Catatan uang kas keluarga, terpisah dari Brangkas</small></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">${kasState.can_edit?'<button class="primary" onclick="kasModal()">✎ Kelola Kas</button>':''}<button class="btn" onclick="window.location='/api/kas/export'">⇩ Export Excel</button></div></div>
      <div class="vaultHero"><div class="vaultIcon">💵</div><div><small>Saldo Kas</small><strong>${money(kasState.balance)}</strong><span>Terakhir diperbarui ${kasState.updated_at?new Date(kasState.updated_at).toLocaleString('id-ID'):'-'}</span></div></div>
      <div class="panel vaultPanel"><div class="section"><h3>Riwayat Kas</h3><small>${kasState.can_edit?'Catat pemasukan dan pengeluaran kas.':'Riwayat transaksi kas.'}</small></div>
      ${tx.length?'<table><thead><tr><th>Tanggal</th><th>Jenis</th><th>Nominal</th><th>Saldo Setelah</th><th>Kategori</th><th>Petugas</th><th>Catatan</th></tr></thead><tbody>'+tx.map(x=>'<tr><td>'+new Date(x.created_at).toLocaleString('id-ID')+'</td><td><span class="vaultBadge '+x.type+'">'+(x.type==='IN'?'MASUK':'KELUAR')+'</span></td><td>'+money(x.amount)+'</td><td>'+money(x.balance_after)+'</td><td>'+esc(x.category||'Lainnya')+'</td><td>'+esc(x.user||'-')+'</td><td>'+esc(x.note||'-')+'</td></tr>').join('')+'</tbody></table>':'<div class="empty">Belum ada transaksi Kas.</div>'}</div>`;
  }catch(e){el.innerHTML='<div class="panel"><b>Gagal memuat Kas</b><p>'+esc(e.message)+'</p></div>'}
}
function kasModal(){
 openM('Kelola Kas',`<form id="kf"><div class="vaultChoice"><label><input type="radio" name="kt" value="IN" checked> Uang Masuk</label><label><input type="radio" name="kt" value="OUT"> Uang Keluar</label></div><select id="kc"><option>Setoran Kas</option><option>Operasional</option><option>Pembelian</option><option>Transport</option><option>Konsumsi</option><option>Bonus</option><option>Lainnya</option></select><input id="ka" type="number" min="1" step="1" placeholder="Nominal, contoh 500000" required><textarea id="kn" placeholder="Catatan transaksi"></textarea><div class="modalactions"><button type="button" class="btn" onclick="closeM()">Batal</button><button class="primary">Simpan Transaksi</button></div></form>`);
 document.getElementById('kf').onsubmit=async e=>{e.preventDefault();try{await api('/api/kas/adjust',{method:'POST',body:JSON.stringify({type:document.querySelector('input[name="kt"]:checked').value,amount:document.getElementById('ka').value,category:document.getElementById('kc').value,note:document.getElementById('kn').value})});closeM();loadKas();toast('Kas diperbarui')}catch(err){toast(err.message)}}
}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
