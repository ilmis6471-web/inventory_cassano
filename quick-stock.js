// Cassano - Quick Stock Entry
(function(){
  const css=`
    .quickStockBtn{margin-left:6px}
    .quickStockHint{color:#8d95a3;font-size:11px;margin-top:4px}
  `;
  function inject(){if(document.getElementById('quick-stock-style'))return;const s=document.createElement('style');s.id='quick-stock-style';s.textContent=css;document.head.appendChild(s)}
  function addQuickButton(){
    inject();
    const section=document.querySelector('#items .section');
    if(!section||section.querySelector('.quickStockBtn')||typeof stockModal!=='function')return;
    const buttons=section.querySelectorAll('button');
    if(!buttons.length)return;
    if(!window.perms||!Array.isArray(window.perms))return;
    if(!window.perms.includes('stock'))return;
    const b=document.createElement('button');
    b.className='btn quickStockBtn';
    b.type='button';
    b.textContent='+ Stok Masuk';
    b.onclick=()=>stockModal();
    section.appendChild(b);
  }
  const observer=new MutationObserver(()=>addQuickButton());
  observer.observe(document.body,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',addQuickButton);
})();
