// Cassano monthly sales UI - loaded after final-fix so the filter is the active salesPage.
(function(){
  const moneyFmt=n=>typeof money==='function'?money(n):new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(n)||0);
  const esc=s=>String(s??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const pad=n=>String(n).padStart(2,'0');
  const monthOf=v=>{const d=new Date(v);return Number.isNaN(d.getTime())?'':`${d.getFullYear()}-${pad(d.getMonth()+1)}`};
  const label=v=>{if(!v)return 'Semua Periode';const [y,m]=v.split('-').map(Number);return new Date(y,m-1,1).toLocaleDateString('id-ID',{month:'long',year:'numeric'})};
  const nowMonth=()=>{const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}`};
  window.salesPage=async function(){
    try{
      const d=await api('/api/sales');
      const approved=Array.isArray(d.approved)?d.approved:[];
      const months=[...new Set(approved.map(o=>monthOf(o.created_at)).filter(Boolean))].sort().reverse();
      let selected=window.cassanoSalesMonth||nowMonth();
      if(selected!=='all' && selected!==nowMonth() && !months.includes(selected)) selected=nowMonth();
      window.cassanoSalesMonth=selected;
      const rows=selected==='all'?approved:approved.filter(o=>monthOf(o.created_at)===selected);
      const total=rows.reduce((s,o)=>s+Number(o.total||0),0);
      const lifetime=approved.reduce((s,o)=>s+Number(o.total||0),0);
      const avg=rows.length?total/rows.length:0;
      const options=[`<option value="all" ${selected==='all'?'selected':''}>Semua Periode</option>`,...months.map(m=>`<option value="${m}" ${m===selected?'selected':''}>${label(m)}</option>`)].join('');
      $('sales').innerHTML=`<div class="section"><div><h2>Dana Penjualan</h2><small>Total penjualan bisa dilihat per bulan tanpa menghapus riwayat.</small></div><div style="display:flex;align-items:center;gap:8px"><b style="font-size:11px;color:#8d95a3">PERIODE</b><select id="cassanoSalesMonth" onchange="window.cassanoSalesMonth=this.value;salesPage()" style="min-width:175px;padding:9px 12px;border-radius:8px">${options}</select></div></div>
      <div class="stats"><div class="card salesTotalCard"><small>💰 TOTAL PENJUALAN • ${label(selected==='all'?'':selected)}</small><strong>${moneyFmt(total)}</strong><span style="display:block;color:#8d95a3;font-size:12px;margin-top:7px">${rows.length} transaksi disetujui</span></div><div class="card"><small>💵 DANA PENJUALAN SAAT INI</small><strong>${moneyFmt(d.balance||0)}</strong><span style="display:block;color:#8d95a3;font-size:12px;margin-top:7px">Belum dipindahkan ke Brangkas</span></div><div class="card"><small>📈 RATA-RATA TRANSAKSI</small><strong>${moneyFmt(avg)}</strong><span style="display:block;color:#8d95a3;font-size:12px;margin-top:7px">Periode terpilih</span></div><div class="card"><small>📊 TOTAL SEPANJANG MASA</small><strong>${moneyFmt(lifetime)}</strong><span style="display:block;color:#8d95a3;font-size:12px;margin-top:7px">Riwayat tetap aman</span></div></div>
      ${allow('approve')?`<div class="panel" style="margin-top:14px"><h3>Pindahkan Dana ke Brangkas</h3><div style="display:flex;gap:10px;flex-wrap:wrap"><input id="transferAmount" type="number" min="1" placeholder="Nominal"><input id="transferNote" placeholder="Catatan"><button class="primary" onclick="transferSales()">Pindahkan</button></div></div>`:''}
      <div class="panel" style="margin-top:14px"><div class="section" style="margin-bottom:8px"><div><h3>Riwayat Penjualan</h3><small>${label(selected==='all'?'':selected)}</small></div><b>${moneyFmt(total)}</b></div><table><thead><tr><th>Tanggal</th><th>Order</th><th>Pembeli</th><th>Total</th><th>Nota</th></tr></thead><tbody>${rows.slice(0,100).map(o=>`<tr><td>${o.created_at?new Date(o.created_at).toLocaleString('id-ID'):'-'}</td><td><b>${esc(o.order_no||'-')}</b></td><td>${esc(o.requester||'-')}</td><td><b>${moneyFmt(o.total)}</b></td><td><button class="primary" onclick="receiptModal(${o.id})">🧾 Nota</button></td></tr>`).join('')||'<tr><td colspan="5">Belum ada penjualan pada periode ini.</td></tr>'}</tbody></table></div>`;
    }catch(e){$('sales').innerHTML=`<div class="panel">${esc(e.message)}</div>`}
  };
})();
