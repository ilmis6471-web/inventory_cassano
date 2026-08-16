// Inventory Cassano - Premium RP Command Center
(function(){
  const fmt=n=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(n)||0);
  const esc=s=>String(s??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const ago=value=>{
    const d=new Date(value); if(!value||Number.isNaN(d.getTime())) return '-';
    const sec=Math.max(0,Math.floor((Date.now()-d.getTime())/1000));
    if(sec<60) return 'baru saja'; const min=Math.floor(sec/60); if(min<60) return `${min}m lalu`;
    const hr=Math.floor(min/60); if(hr<24) return `${hr}j lalu`; const day=Math.floor(hr/24); return `${day}h lalu`;
  };
  const typeClass=t=>String(t||'').toUpperCase().includes('OUT')||String(t||'').toLowerCase().includes('keluar')?'out':'in';

  const css=`
  .dashShell{display:grid;gap:16px}
  .dashWelcome{position:relative;overflow:hidden;padding:24px 26px;border:1px solid #43202a;border-radius:16px;background:radial-gradient(circle at 85% 20%,rgba(197,22,50,.22),transparent 35%),linear-gradient(135deg,#15161b,#240b12 72%,#12090c);display:flex;justify-content:space-between;align-items:center;gap:20px;box-shadow:0 12px 35px rgba(0,0,0,.18)}
  .dashWelcome:after{content:'C';position:absolute;right:28px;top:-28px;font:900 150px/1 Georgia,serif;color:rgba(255,255,255,.025);pointer-events:none}
  .dashEyebrow{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#ff6377;font-weight:800;margin-bottom:7px}.dashWelcome h2{margin:0;font-size:24px}.dashWelcome p{margin:7px 0 0;color:#9ca3af}.dashRole{position:relative;z-index:1;padding:7px 12px;border-radius:999px;background:#c51632;color:#fff;font-weight:800;font-size:11px;text-transform:uppercase;letter-spacing:.7px;box-shadow:0 5px 18px rgba(197,22,50,.22)}
  .dashGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.dashStat{min-width:0;padding:17px 18px;border:1px solid #292c34;border-radius:14px;background:linear-gradient(145deg,#121419,#101115)}.dashStat small{color:#9ca3af;display:block;margin-bottom:8px}.dashStat strong{display:block;font-size:25px;letter-spacing:-.5px}.dashStat .sub{font-size:11px;color:#707786;margin-top:7px}.dashStat.accent{border-color:#4b1d28;background:linear-gradient(145deg,#18191f,#251019)}.dashStat.accent strong{color:#ff5269}
  .dashCols{display:grid;grid-template-columns:1.25fr .75fr;gap:16px}.dashPanel{border:1px solid #292c34;border-radius:14px;background:#121419;overflow:hidden;box-shadow:0 8px 25px rgba(0,0,0,.08)}.dashPanelHead{padding:15px 17px;border-bottom:1px solid #292c34;display:flex;justify-content:space-between;align-items:center;gap:10px}.dashPanelHead h3{margin:0;font-size:14px}.dashPanelHead span{font-size:11px;color:#777f8d}.dashList{padding:0 17px}.dashRow{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px 0;border-bottom:1px solid #24262d}.dashRow:last-child{border-bottom:0}.dashMeta{color:#8d95a3;font-size:11px;margin-top:4px}.dashBadge{padding:5px 9px;border-radius:999px;font-size:10px;font-weight:800;white-space:nowrap}.dashBadge.pending{background:#3a2d12;color:#ffd36b}.dashBadge.approved{background:#12351f;color:#55d98a}.dashBadge.rejected{background:#3b151d;color:#ff738b}.dashBadge.in{background:#12351f;color:#55d98a}.dashBadge.out{background:#3b151d;color:#ff738b}.dashEmpty{padding:25px 8px;text-align:center;color:#777f8d;font-size:12px}.dashActions{display:flex;gap:6px}.dashActions button{cursor:pointer;font-size:11px;padding:7px 9px}.dashMini{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:15px}.dashMiniBox{padding:13px;border:1px solid #292c34;border-radius:10px;background:#101115}.dashMiniBox small{display:block;color:#8d95a3;margin-bottom:5px}.dashMiniBox b{font-size:19px}.dashActivityIcon{width:28px;height:28px;flex:0 0 28px;border-radius:9px;display:grid;place-items:center;background:#252830;font-size:12px}.dashActivity{display:flex;align-items:center;gap:10px}.dashQuick{display:flex;gap:8px;flex-wrap:wrap;padding:13px 17px;border-top:1px solid #292c34}.dashQuick button{font-size:11px;padding:8px 10px}.dashRoleList{padding:0 17px 12px}.dashRoleItem{display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid #24262d;font-size:12px}.dashRoleItem:last-child{border-bottom:0}.dashRoleDot{display:inline-block;width:6px;height:6px;border-radius:50%;background:#c51632;margin-right:7px}
  .navGroupLabel{padding:12px 10px 5px;color:#555c68;font-size:9px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;pointer-events:none}
  aside .side{border-bottom:1px solid #24262d;margin-bottom:8px}.side b{color:#f3f3f5}.side b:after{content:' • RP';color:#c51632;font-size:9px;letter-spacing:1px}.me{background:linear-gradient(145deg,#111217,#171016)}nav button{transition:background .18s,transform .18s,color .18s}nav button:hover{transform:translateX(2px)}
  @media(max-width:1050px){.dashGrid{grid-template-columns:repeat(2,1fr)}}
  @media(max-width:900px){.dashCols{grid-template-columns:1fr}.dashWelcome{align-items:flex-start;flex-direction:column}}
  @media(max-width:560px){.dashGrid{grid-template-columns:1fr}.dashWelcome{padding:20px}.dashWelcome h2{font-size:20px}.dashPanelHead{padding:13px}.dashList{padding:0 13px}}
  `;
  function inject(){if(document.getElementById('dashboard-extra-style'))return;const s=document.createElement('style');s.id='dashboard-extra-style';s.textContent=css;document.head.appendChild(s)}

  function enhanceNav(){
    const nav=document.getElementById('nav'); if(!nav||nav.dataset.enhanced)return;
    nav.dataset.enhanced='1';
    const groups={dashboard:'MAIN',items:'INVENTORY',cart:'TRANSAKSI',orders:'TRANSAKSI',history:'TRANSAKSI',sales:'KEUANGAN',stock:'INVENTORY',vault:'KEUANGAN',roles:'SYSTEM',users:'SYSTEM'};
    let last=''; [...nav.children].forEach(btn=>{
      const g=groups[btn.dataset.p]||''; if(g&&g!==last){const label=document.createElement('div');label.className='navGroupLabel';label.textContent=g;nav.insertBefore(label,btn);last=g;}
    });
  }

  window.dash=async function(){
    inject(); enhanceNav();
    const el=document.getElementById('dashboard');
    if(String(me?.role||'').toLowerCase()!=='bos'){
      el.innerHTML=''; const navBtn=document.querySelector('nav button[data-p="dashboard"]'); if(navBtn)navBtn.remove(); return;
    }
    try{
      const [vault,usersData,movements]=await Promise.all([
        api('/api/vault').catch(()=>({balance:0})),
        allow('users')?api('/api/users').catch(()=>[]):Promise.resolve([]),
        api('/api/movements').catch(()=>[])
      ]);
      const pending=orders.filter(o=>o.status==='Pending');
      const approved=orders.filter(o=>o.status==='Approved');
      const rejected=orders.filter(o=>o.status==='Rejected');
      const spent=approved.reduce((s,o)=>s+Number(o.total||0),0);
      const stock=items.reduce((s,i)=>s+Number(i.stock||0),0);
      const low=items.filter(i=>Number(i.stock||0)<=3).sort((a,b)=>Number(a.stock)-Number(b.stock)).slice(0,6);
      const roleCounts={};(usersData||[]).forEach(u=>roleCounts[u.role]=(roleCounts[u.role]||0)+1);
      const memberCount=(usersData||[]).length;
      const activity=[
        ...(movements||[]).slice(0,5).map(m=>({kind:'movement',date:m.created_at,user:m.user,item:m.item,qty:m.qty,type:m.type})),
        ...orders.slice(0,5).map(o=>({kind:'order',date:o.created_at,user:o.requester,item:o.order_no,qty:null,type:o.status,total:o.total}))
      ].sort((a,b)=>new Date(b.date||0)-new Date(a.date||0)).slice(0,6);

      el.innerHTML=`<div class="dashShell">
        <div class="dashWelcome"><div><div class="dashEyebrow">CASSANO FAMIGLIA</div><h2>Command Center</h2><p>Kontrol pusat inventory & aktivitas internal Cassano.</p></div><span class="dashRole">${esc(me.role)}</span></div>
        <div class="dashGrid">
          <div class="dashStat accent"><small>💰 Saldo Brangkas</small><strong>${fmt(vault.balance)}</strong><div class="sub">Dana internal Cassano</div></div>
          <div class="dashStat"><small>📦 Total Stok</small><strong>${stock.toLocaleString('id-ID')}</strong><div class="sub">${items.length} jenis barang</div></div>
          <div class="dashStat"><small>🛒 Menunggu ACC</small><strong>${pending.length}</strong><div class="sub">Pesanan perlu diproses</div></div>
          <div class="dashStat"><small>♟ Member</small><strong>${memberCount}</strong><div class="sub">Total akun keluarga</div></div>
        </div>
        <div class="dashCols">
          <div class="dashPanel">
            <div class="dashPanelHead"><h3>⚡ Aktivitas Terbaru</h3><span>LIVE LOG</span></div>
            <div class="dashList">${activity.map(a=>{
              const isMove=a.kind==='movement', out=isMove&&typeClass(a.type)==='out';
              return `<div class="dashRow"><div class="dashActivity"><span class="dashActivityIcon">${isMove?(out?'↗':'↙'):'◆'}</span><div><b>${esc(a.item||'-')}</b><div class="dashMeta">${esc(a.user||'-')} ${isMove?`• ${out?'Keluar':'Masuk'} ${esc(a.qty??'')} pcs`:`• ${esc(a.type||'')} ${a.total?`• ${fmt(a.total)}`:''}`}</div></div></div><span class="dashMeta">${ago(a.date)}</span></div>`;
            }).join('')||'<div class="dashEmpty">Belum ada aktivitas.</div>'}</div>
            <div class="dashQuick"><button class="btn" onclick="show('items')">📦 Lihat Barang</button><button class="btn" onclick="show('orders')">🛒 Lihat Pesanan</button><button class="btn" onclick="show('vault')">💰 Buka Brangkas</button></div>
          </div>
          <div class="dashPanel">
            <div class="dashPanelHead"><h3>⚠️ Stok Menipis</h3><span>≤ 3</span></div>
            <div class="dashList">${low.map(i=>`<div class="dashRow"><div><b>${esc(i.name)}</b><div class="dashMeta">${esc(i.code)} • ${esc(i.category||'-')}</div></div><span class="dashBadge ${Number(i.stock)===0?'rejected':'pending'}">${Number(i.stock||0)} pcs</span></div>`).join('')||'<div class="dashEmpty">Semua stok aman.</div>'}</div>
            ${allow('users')?`<div class="dashPanelHead"><h3>♟ Struktur Keluarga</h3><span>${memberCount} member</span></div><div class="dashRoleList">${Object.entries(roleCounts).map(([r,n])=>`<div class="dashRoleItem"><span><i class="dashRoleDot"></i>${esc(r)}</span><b>${n}</b></div>`).join('')||'<div class="dashEmpty">Belum ada data member.</div>'}</div>`:''}
          </div>
        </div>
        <div class="dashCols">
          <div class="dashPanel"><div class="dashPanelHead"><h3>🔔 Pesanan Menunggu ACC</h3><span>${pending.length} pesanan</span></div><div class="dashList">${pending.slice(0,6).map(o=>`<div class="dashRow"><div><b>${esc(o.order_no)}</b><div class="dashMeta">${esc(o.requester)} • ${fmt(o.total)}</div></div><div class="dashActions">${allow('approve')?`<button class="primary" onclick="approve(${o.id},1)">ACC</button><button class="btn" onclick="approve(${o.id},0)">Tolak</button>`:`<span class="dashBadge pending">PENDING</span>`}</div></div>`).join('')||'<div class="dashEmpty">Tidak ada pesanan yang menunggu ACC.</div>'}</div></div>
          <div class="dashPanel"><div class="dashPanelHead"><h3>🕒 Pesanan Terbaru</h3><span>${orders.length} total</span></div><div class="dashList">${orders.slice(0,6).map(o=>`<div class="dashRow"><div><b>${esc(o.order_no)}</b><div class="dashMeta">${esc(o.requester)} • ${fmt(o.total)}</div></div><span class="dashBadge ${String(o.status||'').toLowerCase()}">${esc(o.status)}</span></div>`).join('')||'<div class="dashEmpty">Belum ada pesanan.</div>'}</div></div>
        </div>
      </div>`;
    }catch(e){el.innerHTML=`<div class="panel"><b>Dashboard gagal dimuat</b><p>${esc(e.message)}</p></div>`}
  };
})();
