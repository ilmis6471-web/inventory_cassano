// Stable Member + Ranking navigation/render fix
(function(){
  const esc=s=>String(s??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const money=n=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(n)||0);
  const ensureNav=()=>{
    if(!Array.isArray(navs))return;
    if(!navs.some(n=>n[0]==='members'))navs.push(['members','♙ Member']);
    if(!navs.some(n=>n[0]==='ranking'))navs.push(['ranking','♛ Ranking Cassano']);
    const originalBuild=window.buildNav;
    window.buildNav=function(){
      const list=navs.filter(n=>n[0]==='dashboard'||n[0]==='vault'||n[0]==='members'||n[0]==='ranking'||(n[0]==='sales'&&allow('approve'))||allow(n[0]));
      $('nav').innerHTML=list.map(n=>`<button data-p="${n[0]}">${n[1]}</button>`).join('');
      document.querySelectorAll('#nav button').forEach(b=>b.onclick=()=>window.show(b.dataset.p));
    };
    window.buildNav();
  };
  const css=()=>{if($('memberRankFixStyle'))return;const s=document.createElement('style');s.id='memberRankFixStyle';s.textContent='.mrfHero{padding:24px;border:1px solid #43202a;border-radius:16px;background:linear-gradient(135deg,#15161b,#260b12);margin-bottom:15px}.mrfGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:13px}.mrfCard{padding:18px;border:1px solid #2b2e36;border-radius:14px;background:#121419}.mrfAvatar{width:48px;height:48px;border-radius:14px;background:#681326;color:#fff;display:grid;place-items:center;font-weight:900;font-size:20px}.mrfTop{display:flex;align-items:center;gap:12px}.mrfCard h3{margin:0 0 4px}.mrfCard p{color:#7f8794;font-size:11px}.mrfStats{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:14px 0}.mrfStat{padding:10px;border:1px solid #292c34;border-radius:9px}.mrfStat small{display:block;color:#747c89;font-size:9px}.mrfStat b{display:block;margin-top:4px}.mrfTable{margin-top:15px;border:1px solid #2b2e36;border-radius:14px;background:#121419;overflow:auto}.mrfRow{display:grid;grid-template-columns:60px 1fr auto;align-items:center;gap:12px;padding:13px 16px;border-bottom:1px solid #24262d}.mrfRow:last-child{border-bottom:0}.mrfRank{font-size:20px;text-align:center}.mrfMoney{font-weight:900}.mrfEmpty{padding:30px;text-align:center;color:#747c89}@media(max-width:800px){.mrfGrid{grid-template-columns:1fr 1fr}}@media(max-width:550px){.mrfGrid{grid-template-columns:1fr}.mrfRow{grid-template-columns:42px 1fr}.mrfMoney{grid-column:2}}';document.head.appendChild(s)};
  function renderMembers(){css();const list=(users&&users.length)?users:(me?[me]:[]);$('members').innerHTML=`<div class="mrfHero"><small>MEMBER DIRECTORY</small><h2>Member Profile</h2><p style="color:#9299a5">Daftar anggota dan ringkasan aktivitas internal Cassano.</p></div><div class="mrfGrid">${list.map(u=>`<div class="mrfCard"><div class="mrfTop"><div class="mrfAvatar">${esc((u.name||'?')[0].toUpperCase())}</div><div><h3>${esc(u.name)}</h3><small>${esc(u.role||'-')}</small></div></div><p>${esc(u.email||'-')}</p><button class="btn" onclick="stableMember(${u.id})">Lihat Profil</button></div>`).join('')||'<div class="mrfEmpty">Belum ada member.</div>'}</div>`}
  function renderRanking(){css();const approved=(orders||[]).filter(o=>o.status==='Approved'),map={};approved.forEach(o=>{const n=o.requester||'-';if(!map[n])map[n]={name:n,total:0,count:0};map[n].total+=Number(o.total||0);map[n].count++});const rank=Object.values(map).sort((a,b)=>b.total-a.total);$('ranking').innerHTML=`<div class="mrfHero"><small>CASSANO FAMIGLIA</small><h2>Ranking Internal Cassano</h2><p style="color:#9299a5">Peringkat berdasarkan total nilai transaksi yang telah di-ACC.</p></div><div class="stats"><div class="card"><small>🏆 TOP MEMBER</small><strong>${esc(rank[0]?.name||'-')}</strong></div><div class="card"><small>📦 TOTAL ORDER</small><strong>${approved.length}</strong></div><div class="card"><small>💰 TOTAL PENJUALAN</small><strong>${money(approved.reduce((s,o)=>s+Number(o.total||0),0))}</strong></div><div class="card"><small>♟ MEMBER AKTIF</small><strong>${rank.length}</strong></div></div><div class="mrfTable">${rank.map((r,i)=>`<div class="mrfRow"><div class="mrfRank">${i<3?['🥇','🥈','🥉'][i]:i+1}</div><div><b>${esc(r.name)}</b><br><small>${r.count} transaksi approved</small></div><div class="mrfMoney">${money(r.total)}</div></div>`).join('')||'<div class="mrfEmpty">Belum ada transaksi approved.</div>'}</div>`}
  const originalShow=window.show;
  window.show=function(p){
    if(p==='members'||p==='ranking'){
      document.querySelectorAll('.page').forEach(x=>x.classList.add('hidden'));
      const page=$(p);if(!page)return;
      page.classList.remove('hidden');
      document.querySelectorAll('#nav button').forEach(x=>x.classList.toggle('active',x.dataset.p===p));
      $('title').textContent=p==='members'?'Member':'Ranking Cassano';
      return p==='members'?renderMembers():renderRanking();
    }
    return originalShow(p);
  };
  function boot(){ensureNav();if($('logout')){$('logout').style.cssText='width:100%;margin-top:6px;border:1px solid #2b2e36;background:#191b21;color:#b8bdc7;border-radius:8px;padding:9px 11px;font-weight:700;text-align:left';}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
