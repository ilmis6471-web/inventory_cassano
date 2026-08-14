// Inventory Cassano - Dashboard Bos/Management
(function(){
  const fmt=n=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(n)||0);
  const esc=s=>String(s??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const css=`
  .dashWelcome{padding:20px 24px;border:1px solid #35202a;border-radius:16px;background:linear-gradient(135deg,#15161b,#260b12);margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;gap:20px}.dashWelcome h2{margin:0}.dashWelcome p{margin:6px 0 0;color:#9ca3af}.dashRole{padding:7px 11px;border-radius:999px;background:#c51632;color:#fff;font-weight:700;font-size:12px}.dashGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-bottom:16px}.dashStat{padding:18px;border:1px solid #292c34;border-radius:14px;background:#121419}.dashStat small{color:#9ca3af;display:block;margin-bottom:9px}.dashStat strong{font-size:25px}.dashStat .sub{font-size:12px;color:#777f8d;margin-top:7px}.dashMoney{background:linear-gradient(135deg,#18191f,#251019);border-color:#4b1d28}.dashMoney strong{color:#ff4963}.dashCols{display:grid;grid-template-columns:1.35fr .65fr;gap:16px}.dashPanel{border:1px solid #292c34;border-radius:14px;background:#121419;overflow:hidden}.dashPanelHead{padding:16px 18px;border-bottom:1px solid #292c34;display:flex;justify-content:space-between;align-items:center}.dashPanelHead h3{margin:0}.dashList{padding:0 18px}.dashRow{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 0;border-bottom:1px solid #24262d}.dashRow:last-child{border-bottom:0}.dashMeta{color:#8d95a3;font-size:12px;margin-top:4px}.dashBadge{padding:5px 9px;border-radius:999px;font-size:11px;font-weight:700}.dashBadge.pending{background:#3a2d12;color:#ffd36b}.dashBadge.approved{background:#12351f;color:#55d98a}.dashBadge.rejected{background:#3b151d;color:#ff738b}.dashRoleList{padding:16px 18px}.dashRoleItem{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #24262d}.dashRoleItem:last-child{border-bottom:0}.dashActions{display:flex;gap:8px}.dashActions button{cursor:pointer}.dashEmpty{padding:28px;text-align:center;color:#777f8d}.dashMini{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:16px}.dashMiniBox{padding:14px;border:1px solid #292c34;border-radius:10px}.dashMiniBox small{display:block;color:#8d95a3;margin-bottom:5px}.dashMiniBox b{font-size:20px}@media(max-width:900px){.dashGrid{grid-template-columns:repeat(2,1fr)}.dashCols{grid-template-columns:1fr}}@media(max-width:560px){.dashGrid{grid-template-columns:1fr}.dashWelcome{align-items:flex-start;flex-direction:column}}
  `;
  function inject(){if(document.getElementById('dashboard-extra-style'))return;const s=document.createElement('style');s.id='dashboard-extra-style';s.textContent=css;document.head.appendChild(s)}
  window.dash=async function(){
    inject();
    const el=document.getElementById('dashboard');
    if(String(me?.role||'').toLowerCase()!=='bos'){
      el.innerHTML='';
      const navBtn=document.querySelector('nav button[data-p="dashboard"]');
      if(navBtn)navBtn.remove();
      return;
    }
    try{
      const [vault,usersData]=await Promise.all([api('/api/vault').catch(()=>({balance:0})),allow('users')?api('/api/users').catch(()=>[]):Promise.resolve([])]);
      const pending=orders.filter(o=>o.status==='Pending');
      const approved=orders.filter(o=>o.status==='Approved');
      const rejected=orders.filter(o=>o.status==='Rejected');
      const spent=approved.reduce((s,o)=>s+Number(o.total||0),0);
      const stock=items.reduce((s,i)=>s+Number(i.stock||0),0);
      const low=items.filter(i=>Number(i.stock||0)<=3).sort((a,b)=>Number(a.stock)-Number(b.stock)).slice(0,6);
      const roleCounts={};(usersData||[]).forEach(u=>roleCounts[u.role]=(roleCounts[u.role]||0)+1);
      el.innerHTML=`
        <div class="dashWelcome"><div><h2>Cassano Command Center</h2><p>Kontrol pusat Inventory Cassano</p></div><span class="dashRole">${esc(me.role)}</span></div>
        <div class="dashGrid">
          <div class="dashStat dashMoney"><small>💰 Saldo Brangkas</small><strong>${fmt(vault.balance)}</strong><div class="sub">Keuangan internal Cassano</div></div>
          <div class="dashStat"><small>📦 Total Stok</small><strong>${stock.toLocaleString('id-ID')}</strong><div class="sub">${items.length} jenis barang</div></div>
          <div class="dashStat"><small>🛒 Menunggu ACC</small><strong>${pending.length}</strong><div class="sub">Pesanan perlu diproses</div></div>
          <div class="dashStat"><small>💸 Pengeluaran Disetujui</small><strong>${fmt(spent)}</strong><div class="sub">${approved.length} pesanan approved</div></div>
        </div>
        <div class="dashCols">
          <div class="dashPanel"><div class="dashPanelHead"><h3>🔔 Pesanan Menunggu ACC</h3><span>${pending.length} pesanan</span></div><div class="dashList">${pending.slice(0,8).map(o=>`<div class="dashRow"><div><b>${esc(o.order_no)}</b><div class="dashMeta">${esc(o.requester)} • ${fmt(o.total)}</div></div><div class="dashActions">${allow('approve')?`<button class="primary" onclick="approve(${o.id},1)">ACC</button><button class="btn" onclick="approve(${o.id},0)">Tolak</button>`:`<span class="dashBadge pending">PENDING</span>`}</div></div>`).join('')||'<div class="dashEmpty">Tidak ada pesanan yang menunggu ACC.</div>'}</div></div>
          <div class="dashPanel"><div class="dashPanelHead"><h3>📊 Ringkasan</h3></div><div class="dashMini"><div class="dashMiniBox"><small>Disetujui</small><b>${approved.length}</b></div><div class="dashMiniBox"><small>Ditolak</small><b>${rejected.length}</b></div><div class="dashMiniBox"><small>Jenis Barang</small><b>${items.length}</b></div><div class="dashMiniBox"><small>Stok Menipis</small><b>${low.length}</b></div></div>${allow('users')?`<div class="dashRoleList">${Object.entries(roleCounts).map(([r,n])=>`<div class="dashRoleItem"><span>${esc(r)}</span><b>${n}</b></div>`).join('')}</div>`:''}</div>
        </div>
        <div class="dashCols" style="margin-top:16px">
          <div class="dashPanel"><div class="dashPanelHead"><h3>📦 Stok Menipis</h3><span>≤ 3</span></div><div class="dashList">${low.map(i=>`<div class="dashRow"><div><b>${esc(i.name)}</b><div class="dashMeta">${esc(i.code)} • ${esc(i.category||'-')}</div></div><span class="dashBadge ${Number(i.stock)===0?'rejected':'pending'}">Stok ${Number(i.stock||0)}</span></div>`).join('')||'<div class="dashEmpty">Semua stok aman.</div>'}</div></div>
          <div class="dashPanel"><div class="dashPanelHead"><h3>🕒 Pesanan Terbaru</h3></div><div class="dashList">${orders.slice(0,6).map(o=>`<div class="dashRow"><div><b>${esc(o.order_no)}</b><div class="dashMeta">${esc(o.requester)} • ${fmt(o.total)}</div></div><span class="dashBadge ${o.status.toLowerCase()}">${esc(o.status)}</span></div>`).join('')||'<div class="dashEmpty">Belum ada pesanan.</div>'}</div></div>
        </div>`;
    }catch(e){el.innerHTML=`<div class="panel"><b>Dashboard gagal dimuat</b><p>${esc(e.message)}</p></div>`}
  };
})();