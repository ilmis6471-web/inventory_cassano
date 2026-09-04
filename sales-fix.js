// Cassano Sales: monthly period filter without deleting historical transactions.
(function(){
  const moneyFmt=n=>typeof money==='function'?money(n):new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(n)||0);
  const escHtml=s=>String(s??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const pad=n=>String(n).padStart(2,'0');
  const monthValue=d=>{const x=new Date(d);return Number.isNaN(x.getTime())?'':`${x.getFullYear()}-${pad(x.getMonth()+1)}`};
  const monthLabel=v=>{if(!v)return '-';const [y,m]=v.split('-').map(Number);return new Date(y,m-1,1).toLocaleDateString('id-ID',{month:'long',year:'numeric'})};
  const currentMonth=()=>{const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}`};

  window.salesPage=async function(){
    try{
      const approved=(orders||[]).filter(o=>o.status==='Approved');
      const months=[...new Set(approved.map(o=>monthValue(o.created_at)).filter(Boolean))].sort().reverse();
      const selected=window.salesSelectedMonth||currentMonth();
      if(selected!=='all' && !months.includes(selected) && selected!==currentMonth()) window.salesSelectedMonth=currentMonth();
      const active=window.salesSelectedMonth||currentMonth();
      const filtered=active==='all'?approved:approved.filter(o=>monthValue(o.created_at)===active);
      const total=filtered.reduce((sum,o)=>sum+Number(o.total||0),0);
      const latest=filtered.slice(0,12);
      const count=filtered.length;
      const avg=count?total/count:0;
      const allTotal=approved.reduce((sum,o)=>sum+Number(o.total||0),0);
      const monthOptions=[active==='all'?'<option value="all" selected>Semua periode</option>':'<option value="all">Semua periode</option>',...months.map(m=>`<option value="${m}" ${m===active?'selected':''}>${monthLabel(m)}</option>`)].join('');

      $('sales').innerHTML=`<div class="section"><div><h2>Penjualan</h2><small>Total penjualan otomatis mengikuti periode yang dipilih. Data lama tetap tersimpan.</small></div><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><label style="font-size:11px;color:#8d95a3">PERIODE</label><select id="salesMonthFilter" onchange="window.salesSelectedMonth=this.value;salesPage()" style="min-width:170px">${monthOptions}</select></div></div>
      <div class="stats"><div class="card salesTotalCard"><small>💰 TOTAL PENJUALAN — ${escHtml(monthLabel(active==='all'?'':active))}</small><strong>${moneyFmt(total)}</strong><span style="display:block;color:#8d95a3;font-size:12px;margin-top:7px">${active==='all'?'Seluruh penjualan disetujui':'Penjualan disetujui pada bulan ini'}</span></div><div class="card"><small>🧾 TRANSAKSI DISETUJUI</small><strong>${count}</strong><span style="display:block;color:#8d95a3;font-size:12px;margin-top:7px">Pada periode terpilih</span></div><div class="card"><small>📈 RATA-RATA TRANSAKSI</small><strong>${moneyFmt(avg)}</strong><span style="display:block;color:#8d95a3;font-size:12px;margin-top:7px">Rata-rata nilai order</span></div><div class="card"><small>📊 TOTAL SEPANJANG MASA</small><strong>${moneyFmt(allTotal)}</strong><span style="display:block;color:#8d95a3;font-size:12px;margin-top:7px">Tidak ikut ter-reset</span></div></div>
      <div class="panel" style="margin-top:14px"><div class="section" style="margin-bottom:8px"><div><h3>Riwayat Penjualan</h3><small>${active==='all'?'Semua periode':`Periode ${monthLabel(active)}`}</small></div><b class="salesGrandTotal">${moneyFmt(total)}</b></div><table><thead><tr><th>Tanggal</th><th>Order</th><th>Pembeli</th><th>Disetujui Oleh</th><th>Total</th><th>Nota</th></tr></thead><tbody>${latest.map(o=>`<tr><td>${o.created_at?new Date(o.created_at).toLocaleString('id-ID'):'-'}</td><td><b>${escHtml(o.order_no)}</b></td><td>${escHtml(o.requester)}</td><td>${escHtml(o.approver||'-')}</td><td><b>${moneyFmt(o.total)}</b></td><td><button class="primary" onclick="receiptModal(${o.id})">🧾 Nota</button></td></tr>`).join('')||'<tr><td colspan="6">Belum ada penjualan pada periode ini.</td></tr>'}</tbody></table></div>`;
    }catch(e){$('sales').innerHTML=`<div class="panel">${escHtml(e.message)}</div>`}
  };
})();
