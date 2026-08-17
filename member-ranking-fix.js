// Stable Member + Ranking module — integrated without replacing core app navigation
(function(){
  const esc=s=>String(s??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const money=n=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(n)||0);
  const getUsers=()=>Array.isArray(users)?users:[];
  const getOrders=()=>Array.isArray(orders)?orders:[];
  const getMovements=()=>Array.isArray(movements)?movements:[];
  const roleName=u=>u?.role||'Member';
  const style=()=>{
    if($('memberRankFixStyle'))return;
    const s=document.createElement('style');s.id='memberRankFixStyle';s.textContent=`
      .mrfHero{padding:24px;border:1px solid #43202a;border-radius:16px;background:linear-gradient(135deg,#15161b,#260b12);margin-bottom:15px;box-shadow:0 14px 35px rgba(0,0,0,.16)}
      .mrfHero small{color:#d72a43;font-weight:800;letter-spacing:1.6px}.mrfHero h2{margin:6px 0}.mrfGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:13px}
      .mrfCard{padding:18px;border:1px solid #2b2e36;border-radius:14px;background:linear-gradient(145deg,#15171c,#101115);box-shadow:0 8px 24px rgba(0,0,0,.1)}
      .mrfTop{display:flex;align-items:center;gap:12px}.mrfAvatar{width:50px;height:50px;border-radius:14px;background:linear-gradient(145deg,#7d142d,#3a0b16);color:#fff;display:grid;place-items:center;font-weight:900;font-size:20px;box-shadow:0 0 18px rgba(205,25,55,.18)}
      .mrfCard h3{margin:0 0 4px}.mrfCard p{color:#7f8794;font-size:11px}.mrfCard .btn{margin-top:6px;width:100%}
      .mrfProfile{display:grid;grid-template-columns:280px 1fr;gap:15px}.mrfIdentity{padding:22px;border:1px solid #39202a;border-radius:16px;background:linear-gradient(145deg,#1b1519,#101115)}
      .mrfBigAvatar{width:86px;height:86px;border-radius:22px;background:linear-gradient(145deg,#9b1633,#3c0c17);display:grid;place-items:center;font-size:34px;font-weight:900;box-shadow:0 0 28px rgba(205,25,55,.2);margin-bottom:15px}.mrfIdentity h2{margin:0 0 5px}.mrfRole{color:#ff4965;font-weight:800;text-transform:uppercase;letter-spacing:1.2px;font-size:10px}.mrfStats{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-bottom:15px}.mrfStat{padding:14px;border:1px solid #2b2e36;border-radius:11px;background:#121419}.mrfStat small{display:block;color:#747c89;font-size:9px}.mrfStat b{display:block;margin-top:5px;font-size:17px}.mrfTable{border:1px solid #2b2e36;border-radius:14px;background:#121419;overflow:auto}.mrfRow{display:grid;grid-template-columns:55px 1fr auto;align-items:center;gap:12px;padding:13px 16px;border-bottom:1px solid #24262d}.mrfRow:last-child{border-bottom:0}.mrfRank{font-size:20px;text-align:center}.mrfMoney{font-weight:900}.mrfEmpty{padding:30px;text-align:center;color:#747c89}.mrfBack{margin-bottom:12px}.mrfMovement{margin-top:15px}.mrfMovement .in{color:#63dc91}.mrfMovement .out{color:#ff637b}
      .me{margin-top:auto!important;padding:12px 2px 0!important;border-top:1px solid #24262d}.me #meName{display:block;color:#f2f3f5;font-size:13px;font-weight:800;margin-bottom:3px}.me #meRole{display:block;color:#ff3151!important;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1.3px;margin-bottom:10px}.me #logout{width:100%;margin:0!important;border:1px solid #2b2e36!important;background:linear-gradient(180deg,#1b1d22,#14161a)!important;color:#b8bdc7!important;border-radius:8px!important;padding:9px 11px!important;font-weight:700!important;text-align:left!important;box-shadow:none!important}.me #logout:hover{border-color:#4a2029!important;background:#22171b!important;color:#fff!important}
      @media(max-width:800px){.mrfGrid{grid-template-columns:1fr 1fr}.mrfProfile{grid-template-columns:1fr}.mrfStats{grid-template-columns:1fr 1fr}}@media(max-width:550px){.mrfGrid,.mrfStats{grid-template-columns:1fr}.mrfRow{grid-template-columns:42px 1fr}.mrfMoney{grid-column:2}
      }
    `;document.head.appendChild(s)
  };
  function renderMembers(){
    style();
    const list=getUsers();
    $('members').innerHTML=`<div class="mrfHero"><small>MEMBER DIRECTORY</small><h2>Member Profile</h2><p style="color:#9299a5">Pilih anggota untuk melihat profil dan aktivitas internal Cassano.</p></div><div class="mrfGrid">${list.map(u=>`<div class="mrfCard"><div class="mrfTop"><div class="mrfAvatar">${esc((u.name||'?')[0].toUpperCase())}</div><div><h3>${esc(u.name||'-')}</h3><small>${esc(roleName(u))}</small></div></div><p>${esc(u.email||'-')}</p><button class="btn" type="button" onclick="stableMember(${Number(u.id)})">Lihat Profil</button></div>`).join('')||'<div class="mrfEmpty">Belum ada member.</div>'}</div>`;
  }
  function renderMemberProfile(id){
    style();
    const u=getUsers().find(x=>Number(x.id)===Number(id));
    if(!u){renderMembers();return;}
    const myOrders=getOrders().filter(o=>String(o.requester||'').toLowerCase()===String(u.name||'').toLowerCase());
    const approved=myOrders.filter(o=>o.status==='Approved');
    const total=approved.reduce((s,o)=>s+Number(o.total||0),0);
    const myMoves=getMovements().filter(m=>String(m.user||m.username||m.actor||'').toLowerCase()===String(u.name||'').toLowerCase()).slice(-8).reverse();
    $('members').innerHTML=`<button class="btn mrfBack" type="button" onclick="show('members')">← Kembali ke Member</button><div class="mrfProfile"><div class="mrfIdentity"><div class="mrfBigAvatar">${esc((u.name||'?')[0].toUpperCase())}</div><h2>${esc(u.name||'-')}</h2><div class="mrfRole">${esc(roleName(u))}</div><p>${esc(u.email||'-')}</p><small>Member ID #${esc(u.id)}</small></div><div><div class="mrfStats"><div class="mrfStat"><small>ORDER APPROVED</small><b>${approved.length}</b></div><div class="mrfStat"><small>TOTAL TRANSAKSI</small><b>${money(total)}</b></div><div class="mrfStat"><small>TOTAL ORDER</small><b>${myOrders.length}</b></div></div><div class="mrfTable"><div class="mrfRow"><div></div><div><b>Riwayat Pesanan</b><br><small>Transaksi milik member ini</small></div><div></div></div>${myOrders.slice().reverse().slice(0,10).map(o=>`<div class="mrfRow"><div class="mrfRank">🧾</div><div><b>${esc(o.id||'Order')}</b><br><small>${esc(o.status||'-')} • ${esc(o.approvedBy||'Belum disetujui')}</small></div><div class="mrfMoney">${money(o.total)}</div></div>`).join('')||'<div class="mrfEmpty">Belum ada pesanan.</div>'}</div><div class="mrfMovement"><div class="mrfTable"><div class="mrfRow"><div></div><div><b>Stock Movement</b><br><small>Aktivitas barang member</small></div><div></div></div>${myMoves.map(m=>`<div class="mrfRow"><div class="mrfRank">${String(m.type||m.action||'').toUpperCase()==='IN'?'↙':'↗'}</div><div><b>${esc(m.item||m.itemName||m.name||'Barang')}</b><br><small>${esc(m.type||m.action||'-')} • ${esc(m.date||m.createdAt||'')}</small></div><div class="mrfMoney">${Number(m.qty||m.quantity||0)>0?'+':''}${Number(m.qty||m.quantity||0)}</div></div>`).join('')||'<div class="mrfEmpty">Belum ada stock movement.</div>'}</div></div></div></div>`;
  }
  window.stableMember=renderMemberProfile;
  function renderRanking(){
    style();
    const approved=getOrders().filter(o=>o.status==='Approved'),map={};approved.forEach(o=>{const n=o.requester||'-';if(!map[n])map[n]={name:n,total:0,count:0};map[n].total+=Number(o.total||0);map[n].count++});
    const rank=Object.values(map).sort((a,b)=>b.total-a.total);const total=approved.reduce((s,o)=>s+Number(o.total||0),0);
    $('ranking').innerHTML=`<div class="mrfHero"><small>CASSANO FAMIGLIA</small><h2>Ranking Internal Cassano</h2><p style="color:#9299a5">Peringkat berdasarkan total nilai transaksi yang telah di-ACC.</p></div><div class="stats"><div class="card"><small>🏆 TOP MEMBER</small><strong>${esc(rank[0]?.name||'-')}</strong></div><div class="card"><small>📦 TOTAL ORDER</small><strong>${approved.length}</strong></div><div class="card"><small>💰 TOTAL PENJUALAN</small><strong>${money(total)}</strong></div><div class="card"><small>♟ MEMBER AKTIF</small><strong>${rank.length}</strong></div></div><div class="mrfTable">${rank.map((r,i)=>`<div class="mrfRow"><div class="mrfRank">${i<3?['🥇','🥈','🥉'][i]:i+1}</div><div><b>${esc(r.name)}</b><br><small>${r.count} transaksi approved</small></div><div class="mrfMoney">${money(r.total)}</div></div>`).join('')||'<div class="mrfEmpty">Belum ada transaksi approved.</div>'}</div>`;
  }
  const originalShow=window.show;
  window.show=function(p){
    if(p==='members'||p==='ranking'){
      document.querySelectorAll('.page').forEach(x=>x.classList.add('hidden'));
      const page=$(p);if(!page)return;
      page.classList.remove('hidden');document.querySelectorAll('#nav button').forEach(x=>x.classList.toggle('active',x.dataset.p===p));$('title').textContent=p==='members'?'Member':'Ranking Cassano';
      return p==='members'?renderMembers():renderRanking();
    }
    return originalShow(p);
  };
  function ensureNav(){
    if(!Array.isArray(navs))return;
    if(!navs.some(n=>n[0]==='members'))navs.push(['members','♙ Member']);
    if(!navs.some(n=>n[0]==='ranking'))navs.push(['ranking','♛ Ranking Cassano']);
    const build=()=>{$('nav').innerHTML=navs.filter(n=>n[0]==='dashboard'||n[0]==='vault'||n[0]==='members'||n[0]==='ranking'||(n[0]==='sales'&&allow('approve'))||allow(n[0])).map(n=>`<button data-p="${n[0]}">${n[1]}</button>`).join('');document.querySelectorAll('#nav button').forEach(b=>b.onclick=()=>window.show(b.dataset.p));};
    build();
  }
  function boot(){style();ensureNav();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();