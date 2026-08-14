let vaultReady=false;
function setupVault(){
  if(vaultReady||!window.me)return;
  vaultReady=true;
  const main=document.querySelector('main');
  if(!document.getElementById('vault')){const s=document.createElement('section');s.id='vault';s.className='page hidden';main.appendChild(s)}
  const nav=document.getElementById('nav');
  if(!nav.querySelector('button[data-p="vault"]')){const b=document.createElement('button');b.dataset.p='vault';b.textContent='▣ Brangkas';b.onclick=()=>openVault();nav.appendChild(b)}
}
function openVault(){
  document.querySelectorAll('.page').forEach(x=>x.classList.add('hidden'));
  const p=document.getElementById('vault');if(!p)return;p.classList.remove('hidden');
  document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('active',x.dataset.p==='vault'));
  document.getElementById('title').textContent='Brangkas';
  loadVault();
}
async function loadVault(){
  try{const v=await api('/api/vault');const can=!!v.can_edit;const tx=v.transactions||[];
    document.getElementById('vault').innerHTML=`
      <div class="section"><div><h2>Brangkas Cassano</h2><small>Keuangan internal keluarga</small></div>${can?'<button class="primary" onclick="vaultModal()">✎ Kelola Uang</button>':''}</div>
      <div class="vaultHero"><div class="vaultIcon">▣</div><div><small>Saldo Brangkas</small><strong>${money(v.balance)}</strong><span>Terakhir diperbarui ${v.updated_at?new Date(v.updated_at).toLocaleString('id-ID'):'-'}</span></div></div>
      <div class="panel vaultPanel"><div class="section"><h3>Riwayat Brangkas</h3><small>${can?'Kamu dapat menambah atau mengurangi saldo.':'Hanya Bos dan Consigliere yang dapat mengubah saldo.'}</small></div>
      ${tx.length?`<table><thead><tr><th>Tanggal</th><th>Jenis</th><th>Nominal</th><th>Saldo Setelah</th><th>Petugas</th><th>Catatan</th></tr></thead><tbody>${tx.map(x=>`<tr><td>${new Date(x.created_at).toLocaleString('id-ID')}</td><td><span class="vaultBadge ${x.type}">${x.type==='IN'?'MASUK':'KELUAR'}</span></td><td>${money(x.amount)}</td><td>${money(x.balance_after)}</td><td>${x.user||'-'}</td><td>${x.note||'-'}</td></tr>`).join('')}</tbody></table>`:'<div class="empty">Belum ada transaksi brangkas.</div>'}</div>`;
  }catch(e){document.getElementById('vault').innerHTML=`<div class="panel"><b>Gagal memuat brangkas</b><p>${e.message}</p></div>`}
}
function vaultModal(){
  openM('Kelola Uang Brangkas',`<form id="vf"><div class="vaultChoice"><label><input type="radio" name="vt" value="IN" checked> Uang Masuk</label><label><input type="radio" name="vt" value="OUT"> Uang Keluar</label></div><input id="va" type="number" min="1" step="1" placeholder="Nominal, contoh 500000" required><textarea id="vn" placeholder="Catatan transaksi"></textarea><div class="modalactions"><button type="button" class="btn" onclick="closeM()">Batal</button><button class="primary">Simpan Transaksi</button></div></form>`);
  document.getElementById('vf').onsubmit=async e=>{e.preventDefault();try{await api('/api/vault/adjust',{method:'POST',body:JSON.stringify({type:document.querySelector('input[name="vt"]:checked').value,amount:document.getElementById('va').value,note:document.getElementById('vn').value})});closeM();loadVault();toast('Saldo brangkas diperbarui')}catch(err){toast(err.message)}};
}
(function waitVault(){if(window.me&&document.getElementById('nav'))setupVault();else setTimeout(waitVault,200)})();
