// Fix halaman Penjualan: kompatibel dengan response API lama/baru.
async function salesPage(){
  try{
    const d=await api('/api/sales');
    const transactions=Array.isArray(d.transactions)?d.transactions:[];
    const approved=Array.isArray(d.approved)?d.approved:[];
    const approvedCount=Number.isFinite(Number(d.approved_total))?Number(d.approved_total):approved.length;
    const canMove=allow('approve');
    $('sales').innerHTML=`
      <div class="section">
        <div><h2>Dana Penjualan</h2><small>Dana dari pesanan yang sudah di-ACC dipisahkan dari Brangkas.</small></div>
      </div>
      <div class="stats">
        <div class="card"><small>💵 Dana Penjualan</small><strong>${money(d.balance||0)}</strong><span style="display:block;color:#8d95a3;font-size:12px;margin-top:7px">Belum dipindahkan ke Brangkas</span></div>
        <div class="card"><small>📊 Total Penjualan Disetujui</small><strong>${approvedCount}</strong><span style="display:block;color:#8d95a3;font-size:12px;margin-top:7px">Pesanan approved</span></div>
      </div>
      ${canMove?`<div class="panel" style="margin-top:14px"><h3>Pindahkan Dana ke Brangkas</h3><div style="display:flex;gap:10px;flex-wrap:wrap"><input id="transferAmount" type="number" min="1" placeholder="Nominal" style="max-width:260px"><input id="transferNote" placeholder="Catatan" style="max-width:360px"><button class="primary" onclick="transferSales()">Pindahkan</button></div></div>`:''}
      <div class="panel" style="margin-top:14px"><h3>Riwayat Dana</h3><table><thead><tr><th>Tanggal</th><th>Jenis</th><th>Nominal</th><th>Order</th><th>Petugas</th><th>Catatan</th></tr></thead><tbody>
      ${transactions.map(t=>`<tr><td>${new Date(t.created_at).toLocaleString('id-ID')}</td><td>${t.type==='IN'?'<span class="badge Approved">Masuk</span>':'<span class="badge Rejected">Keluar</span>'}</td><td>${money(t.amount)}</td><td>${t.order_no||'-'}</td><td>${t.user||'-'}</td><td>${t.note||'-'}</td></tr>`).join('')||'<tr><td colspan="6">Belum ada transaksi.</td></tr>'}
      </tbody></table></div>`;
  }catch(e){$('sales').innerHTML=`<div class="panel">${e.message}</div>`}
}
async function transferSales(){
  const amount=Number($('transferAmount')?.value);
  if(!amount)return toast('Masukkan nominal transfer');
  try{await api('/api/sales/transfer',{method:'POST',body:JSON.stringify({amount,note:$('transferNote')?.value||'Dipindahkan ke Brangkas'})});toast('Dana penjualan dipindahkan ke Brangkas');await salesPage();}
  catch(e){toast(e.message)}
}
