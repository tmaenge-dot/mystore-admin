// Client script for store cart page
(function(){
  function showCartToast(msg, timeout){ try{ var t=document.getElementById('cart-toast'); if(!t) return; var el=document.createElement('div'); el.style.background='#0f172a'; el.style.color='#fff'; el.style.padding='10px 14px'; el.style.borderRadius='8px'; el.style.marginTop='8px'; el.textContent=msg; t.appendChild(el); t.style.display='block'; setTimeout(function(){ try{ el.remove(); if(!t.children.length) t.style.display='none'; }catch(e){} }, timeout||3000); }catch(e){} }

  const storeId = window.__storeId || null;
  function loadCart(){ try{ return JSON.parse(localStorage.getItem('cart:'+storeId)) || {items:[]}; }catch(e){return {items:[]};} }
  async function render(){ const c = loadCart(); if(!c.items.length){ var el = document.getElementById('cart-contents'); if(el) el.textContent = 'Cart is empty'; return; }
    var res = await fetch('/api/stores/' + storeId + '/products'); var catalog = []; if (res.ok) catalog = await res.json();
    var lines = await Promise.all(c.items.map(async function(it){ var r = await fetch('/api/stores/'+storeId+'/price?productId='+encodeURIComponent(it.id)+'&qty='+encodeURIComponent(it.qty||0)); if(r.ok){ var j = await r.json(); return { id: it.id, qty: it.qty, unitPrice: j.unitPrice, lineTotal: j.lineTotal, name: (catalog.find(p=>p.id===it.id) || {}).name || it.id }; } return { id: it.id, qty: it.qty, unitPrice: 0, lineTotal: 0, name: it.id }; }));
    var total = lines.reduce((s,l)=>s+(l.lineTotal||0),0);
    var out = '<ul>' + lines.map(l=>'<li>'+l.name+' x'+l.qty+' — BWP '+(l.lineTotal||0).toFixed(2)+' <small>( BWP '+(l.unitPrice||0).toFixed(2)+'/ea )</small></li>').join('') + '</ul><div style="margin-top:12px"><strong>Total: BWP '+ total.toFixed(2) +'</strong></div>';
    var container = document.getElementById('cart-contents'); if(container) container.innerHTML = out;
  }

  var saveBtn = document.getElementById('save'); if(saveBtn) saveBtn.addEventListener('click', async ()=>{ const c = loadCart(); const res = await fetch('/api/stores/' + storeId + '/cart', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ items: c.items }) }); if (res.ok) showCartToast('Saved'); else showCartToast('Save failed'); });

  // add checkout button and wire it
  var saveEl = document.getElementById('save'); if(saveEl) saveEl.insertAdjacentHTML('afterend', '<button id="checkout" style="margin-left:12px">Checkout</button>');
  var checkoutBtn = document.getElementById('checkout'); if(checkoutBtn) checkoutBtn.addEventListener('click', async ()=>{ const c = loadCart(); if (!c.items.length) return showCartToast('Cart empty'); const total = c.items.reduce((s,i)=>s + ((i.qty||0) * 1), 0); const res = await fetch('/api/stores/' + storeId + '/orders', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ items: c.items, total }) }); if (res.ok){ const order = await res.json(); localStorage.removeItem('cart:'+storeId); window.location = '/stores/' + storeId + '/orders/' + order.id; } else { showCartToast('Checkout failed'); } });

  // initial render
  try{ render(); }catch(e){}

})();
