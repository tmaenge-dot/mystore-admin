
// Full client-side script for store pages (extracted from server template)
(function(){
  // Client-side currency formatter (falls back to simple prefix)
  window.__fmtCurrency = function(amount){
    try{ return new Intl.NumberFormat('en-BW', { style: 'currency', currency: 'BWP', maximumFractionDigits: 2 }).format(Number(amount)); }catch(e){ return 'BWP ' + (typeof amount === 'number' ? amount.toFixed(2) : (amount || '0.00')); }
  };

  function setBackdrop(id, on){
    try{
      var el = document.getElementById(id); if(!el) return;
      if(on){ el.style.display = 'flex'; el.style.visibility = 'visible'; el.style.pointerEvents = 'auto'; }
      else { el.style.display = 'none'; el.style.visibility = 'hidden'; el.style.pointerEvents = 'none'; }
    }catch(e){}
  }

  // Defensive: ensure modal backdrops are hidden on initial load
  document.addEventListener('DOMContentLoaded', function(){ try{ setBackdrop('modal-backdrop', false); setBackdrop('cart-backdrop', false); }catch(e){} });

  // storeId is injected by server into window.__storeId before this script is loaded
  const storeId = window.__storeId || null;

  // Persisted preferred store handling
  function setPreferredStore(id){ try{ localStorage.setItem('preferred_store', id); }catch(e){} try{ var expires = new Date(); expires.setDate(expires.getDate() + 365); document.cookie = 'preferred_store=' + encodeURIComponent(id) + '; path=/; expires=' + expires.toUTCString(); }catch(e){} }
  function getPreferredStore(){ try{ return localStorage.getItem('preferred_store') || (document.cookie||'').split(';').map(c=>c.trim()).find(p=>p.startsWith('preferred_store=')) ? decodeURIComponent(((document.cookie||'').split(';').map(c=>c.trim()).find(p=>p.startsWith('preferred_store='))||'').split('=')[1]||'') : null; }catch(e){return null;} }
  function highlightPreferred(){ try{ var pref = getPreferredStore(); if(!pref) return; var items = document.querySelectorAll('.shop-item'); items.forEach(function(it){ if(it.getAttribute('data-store')===pref) it.classList.add('preferred'); else it.classList.remove('preferred'); }); }catch(e){} }

  let products = [];
  function saveCart(c){ try{ localStorage.setItem('cart:'+storeId, JSON.stringify(c)); }catch(e){} }
  function loadCart(){ try{ return JSON.parse(localStorage.getItem('cart:'+storeId)) || {items:[]}; }catch(e){return {items:[]};} }
  function updateCartUI(){ try{ var c = loadCart(); var count = c.items.reduce(function(s,i){return s + (i.qty||0);}, 0); var el = document.getElementById('cart-count'); if(el) el.textContent = count; }catch(e){} }

  async function fetchProducts(){
    try{
      var initial = document.getElementById('initial-products');
      if(initial){ try{ products = JSON.parse(initial.textContent||'[]'); render(products); updateCartUI(); }catch(e){}
      }
    }catch(e){}
    try{ var res = await fetch('/api/stores/' + storeId + '/products'); if(res.ok){ products = await res.json(); render(products); updateCartUI(); } }catch(e){}
  }

  function render(list){
    var out = '';
    for(var i=0;i<list.length;i++){
      var it = list[i];
      var bulkHtml = '';
      if(Array.isArray(it.bulkPricing) && it.bulkPricing.length){
        bulkHtml = '<div class="bulk">';
        for(var b=0;b<it.bulkPricing.length;b++){
          var tier = it.bulkPricing[b];
          var tierPrice = (window.__fmtCurrency ? window.__fmtCurrency(tier.price) : ('BWP ' + (typeof tier.price === 'number' ? tier.price.toFixed(2) : tier.price)));
          bulkHtml += '<div class="tier">Buy '+tier.minQty+'+ @ '+ tierPrice +'</div>';
        }
        bulkHtml += '</div>';
      }
      var priceStr = (window.__fmtCurrency ? window.__fmtCurrency(it.price) : ('BWP ' + (typeof it.price === 'number' ? it.price.toFixed(2) : it.price)));
      out += '<div class="card" data-id="'+it.id+'">'
           + '<div class="thumb" data-id="'+it.id+'" style="width:100%;height:96px;display:flex;align-items:center;justify-content:center">'
           + (it.image?('<img src="'+it.image+'" alt="'+(it.name||'')+'">'):'')
           + '</div>'
           + '<div class="meta"><div class="name">'+ (it.name||'') +'</div>'
           + '<div class="desc">'+ (it.description||'') +'</div>'
           + '<div class="price">'+ priceStr +'</div>'
           + bulkHtml
           + '</div><div style="margin-top:8px"><button class="add" data-id="'+it.id+'">Add</button> <button class="view" data-id="'+it.id+'">View</button></div></div>';
    }
    var container = document.getElementById('products'); if(container) container.innerHTML = out;
    bindAdd();
    bindView();
  }

  function bindAdd(){ var buttons = document.querySelectorAll('.add'); for(var j=0;j<buttons.length;j++){ (function(b){ b.onclick=function(){ var id=b.getAttribute('data-id'); var c=loadCart(); var ex=null; for(var k=0;k<c.items.length;k++){ if(c.items[k].id===id) { ex=c.items[k]; break; } } if(ex) ex.qty+=1; else c.items.push({id:id,qty:1}); saveCart(c); updateCartUI(); }; })(buttons[j]); } }
  function bindView(){ var buttons = document.querySelectorAll('.view, .thumb'); for(var j=0;j<buttons.length;j++){ (function(b){ b.onclick=function(){ var id=b.getAttribute('data-id'); openProduct(id); }; })(buttons[j]); } }

  function openProduct(id){ var p = products.find(function(x){return x.id===id}); if(!p) return; var body = document.getElementById('modal-body'); var bulkHtml=''; if(Array.isArray(p.bulkPricing) && p.bulkPricing.length){ bulkHtml='<div class="bulk-modal"><strong>Bulk pricing:</strong><ul>'; for(var i=0;i<p.bulkPricing.length;i++){ var t=p.bulkPricing[i]; var tPrice = (window.__fmtCurrency? window.__fmtCurrency(t.price) : ('BWP ' + t.price.toFixed(2))); bulkHtml+='<li>Buy '+t.minQty+'+ @ '+ tPrice +'</li>'; } bulkHtml+='</ul></div>'; } var priceStr = (window.__fmtCurrency? window.__fmtCurrency(p.price) : ('BWP ' + (p.price?p.price.toFixed(2):'0.00'))); if(body) body.innerHTML = '<h2>'+ (p.name||'') +'</h2><div style="display:flex;gap:12px"><div style="flex:1">'+(p.image?'<img src="'+p.image+'" style="max-width:180px">':'')+'</div><div style="flex:2"><p>'+ (p.description||'') +'</p><p><strong>'+ priceStr +'</strong></p>'+bulkHtml+'<p><button id="modal-add">Add to cart</button></p></div></div>'; setBackdrop('modal-backdrop', true); var mc = document.getElementById('modal-close'); if(mc) mc.onclick = function(){ setBackdrop('modal-backdrop', false); }; var modalAdd = document.getElementById('modal-body') && document.getElementById('modal-body').querySelector('#modal-add'); if(modalAdd) modalAdd.onclick = function(){ var c = loadCart(); var ex = c.items.find(function(i){return i.id===id}); if(ex) ex.qty+=1; else c.items.push({id:id,qty:1}); saveCart(c); updateCartUI(); setBackdrop('modal-backdrop', false); } }

  var qEl = document.getElementById('q'); if(qEl) qEl.addEventListener('input', function(e){ var q = e.target.value.toLowerCase(); render(products.filter(function(p){ return p.name.toLowerCase().includes(q) || (p.category||'').toLowerCase().includes(q); })); });
  var viewCartBtn = document.getElementById('view-cart'); if(viewCartBtn) viewCartBtn.addEventListener('click', function(){ showCart(); });
  var cartClose = document.getElementById('cart-close'); if(cartClose) cartClose.onclick = function(){ setBackdrop('cart-backdrop', false); };

  async function showCart(){ var c = loadCart(); var list = document.getElementById('cart-list'); if(!list) return; list.innerHTML=''; var total=0; if (!c.items.length){ var totEl = document.getElementById('cart-total'); if(totEl) totEl.textContent = '0.00'; setBackdrop('cart-backdrop', true); return; }
    var lookups = {}; for(var i=0;i<c.items.length;i++){ lookups[c.items[i].id] = true; }
    var prices = {}; var ids = Object.keys(lookups);
    await Promise.all(ids.map(async function(pid){ try{ var r = await fetch('/api/stores/'+storeId+'/price?productId='+encodeURIComponent(pid)+'&qty=1'); if(r.ok){ var j = await r.json(); prices[pid] = j.unitPrice; } }catch(e){} }));
    for(var i=0;i<c.items.length;i++){ var it = c.items[i]; var prod = products.find(function(p){return p.id===it.id}) || {name:it.id}; var unit = typeof prices[it.id]==='number'? prices[it.id] : (prod.price||0); var line = (unit||0) * (it.qty||0); total += line; var unitStr = (window.__fmtCurrency? window.__fmtCurrency(unit) : ('BWP ' + unit.toFixed(2))); var lineStr = (window.__fmtCurrency? window.__fmtCurrency(line) : ('BWP ' + line.toFixed(2))); var li = document.createElement('li'); li.innerHTML = '<div>'+(prod.name||it.id)+' <small style="color:#666">x'+(it.qty||0)+'</small></div><div>'+ lineStr +' <small style="color:#666">( '+ unitStr +'/ea )</small> <button class="inc" data-id="'+it.id+'">+</button> <button class="dec" data-id="'+it.id+'">-</button> <button class="rm" data-id="'+it.id+'">Remove</button></div>'; list.appendChild(li); }
    var totEl2 = document.getElementById('cart-total'); if(totEl2) totEl2.textContent = (window.__fmtCurrency? window.__fmtCurrency(total) : ('BWP ' + total.toFixed(2)));
    Array.from(document.querySelectorAll('#cart-list .inc')).forEach(function(b){ b.onclick=function(){ var id=b.getAttribute('data-id'); var c=loadCart(); var it = c.items.find(function(x){return x.id===id}); if(it){ it.qty = (it.qty||0)+1; saveCart(c); showCart(); updateCartUI(); } }; });
    Array.from(document.querySelectorAll('#cart-list .dec')).forEach(function(b){ b.onclick=function(){ var id=b.getAttribute('data-id'); var c=loadCart(); var it = c.items.find(function(x){return x.id===id}); if(it){ it.qty = Math.max(0, (it.qty||0)-1); if(it.qty===0){ c.items = c.items.filter(function(x){return x.id!==id}); } saveCart(c); showCart(); updateCartUI(); } }; });
    Array.from(document.querySelectorAll('#cart-list .rm')).forEach(function(b){ b.onclick=function(){ var id=b.getAttribute('data-id'); var c=loadCart(); c.items = c.items.filter(function(x){return x.id!==id}); saveCart(c); showCart(); updateCartUI(); }; });
    // Ensure payment/delivery controls are visible when the cart opens
    try{ ensurePaymentControls(); }catch(e){}
    setBackdrop('cart-backdrop', true);
  }

  // Insert basic payment selector into cart modal when showing cart
  function ensurePaymentControls(){ try{
    var cartModal = document.getElementById('cart-modal'); if(!cartModal) return;
    if (document.getElementById('payment-controls')) return; // already added
    var container = document.createElement('div'); container.id = 'payment-controls'; container.style.marginTop = '12px';
  container.innerHTML = '<h4>Payment</h4><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><label><input type="radio" name="pay_method" value="credit_card" checked> Credit Card</label><label><input type="radio" name="pay_method" value="debit_card"> Debit Card</label><label><input type="radio" name="pay_method" value="myzaka"> Myzaka</label><label><input type="radio" name="pay_method" value="orange_money"> Orange Money</label><label><input type="radio" name="pay_method" value="smega"> Smega</label></div><div style="margin-top:8px"><label>Payment token (demo): <input id="payment-token" placeholder="tok_test"></label></div><hr><h4>Delivery</h4><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><label><input type="radio" name="delivery_method" value="store_transport" checked> Store transport</label><label><input type="radio" name="delivery_method" value="yango"> Yango</label><label><input type="radio" name="delivery_method" value="cab"> Cab</label><label><input type="radio" name="delivery_method" value="self"> Self (pickup)</label></div>';
    // insert before the action buttons (save/checkout)
    var actions = cartModal.querySelector('div[style*="text-align:right"]'); if(actions && actions.parentNode){ actions.parentNode.insertBefore(container, actions); }
  }catch(e){}
  }

  function showToast(msg, timeout=3000){ try{ var t = document.getElementById('toast'); if(!t) return; var el = document.createElement('div'); el.style.background='#0f172a'; el.style.color='#fff'; el.style.padding='10px 14px'; el.style.borderRadius='8px'; el.style.marginTop='8px'; el.style.boxShadow='0 8px 24px rgba(2,6,23,0.2)'; el.textContent = msg; t.appendChild(el); t.style.display='block'; setTimeout(function(){ try{ el.remove(); if(!t.children.length) t.style.display='none'; }catch(e){} }, timeout); }catch(e){} }

  var saveServerBtn = document.getElementById('save-server'); if(saveServerBtn) saveServerBtn.onclick = async function(){ var c=loadCart(); const res = await fetch('/api/stores/'+storeId+'/cart',{method:'POST',headers:{'Content-Type':'application/json'}, body:JSON.stringify({ items: c.items })}); if(res.ok) showToast('Saved server-side'); else showToast('Save failed'); };

  var doCheckoutBtn = document.getElementById('do-checkout');
  if(doCheckoutBtn) {
    // original simple handler replaced by a richer handler that reads payment controls
    doCheckoutBtn.addEventListener('click', async function(ev){
      ev.preventDefault();
      var c = loadCart(); if(!c.items.length){ showToast('Cart empty'); return; }
      // make sure payment controls are present for user to select method/token
      ensurePaymentControls();
  var methodEl = document.querySelector('input[name="pay_method"]:checked');
  var method = methodEl ? methodEl.value : 'credit_card';
  var tokenInput = document.getElementById('payment-token');
  var token = tokenInput ? tokenInput.value.trim() : '';
  var deliveryEl = document.querySelector('input[name="delivery_method"]:checked');
  var deliveryMethod = deliveryEl ? deliveryEl.value : 'self';
  var payment = { method: method };
  if (token && token.length) payment.token = token;
      try{
  var res = await fetch('/api/stores/'+storeId+'/checkout', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ items: c.items, payment: payment, delivery: { method: deliveryMethod } }) });
        if (res.ok){ var order = await res.json(); localStorage.removeItem('cart:'+storeId); window.location = '/stores/' + storeId + '/orders/' + order.id; }
        else { var j = await res.json().catch(()=>({error:'unknown'})); showToast('Checkout failed: ' + (j && j.error || 'unknown')); }
      }catch(e){ showToast('Checkout failed: network error'); }
    });
  }

  // Start by fetching products and updating UI
  try{ fetchProducts(); }catch(e){}

  // Wire up shop selector clicks, save buttons, and clear control
  document.addEventListener('DOMContentLoaded', function(){
    try{
      highlightPreferred();
      showBadges();

      var anchors = document.querySelectorAll('.shop-item a');
      anchors.forEach(function(a){ a.addEventListener('click', function(e){ try{ var li = a.closest('.shop-item'); if(li){ var sid = li.getAttribute('data-store'); setPreferredStore(sid); try{ fetch('/api/preferred-store', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ id: sid }) }).then(function(){ highlightPreferred(); showBadges(); }).catch(function(){}); }catch(err){} } }catch(err){} }); });

      var saveBtns = document.querySelectorAll('.save-pref-btn');
      saveBtns.forEach(function(b){
        b.addEventListener('click', function(ev){
          ev.preventDefault(); ev.stopPropagation();
          var sid = b.getAttribute('data-store'); if(!sid) return;
          setPreferredStore(sid);
          b.disabled = true; var prevText = b.textContent; b.textContent = 'Saving...';
          fetch('/api/preferred-store', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ id: sid }) }).then(function(resp){ return resp.json(); }).then(function(j){ b.textContent = 'Saved'; highlightPreferred(); showBadges(); setTimeout(function(){ b.textContent = prevText; b.disabled = false; }, 1200); }).catch(function(){ b.textContent = prevText; b.disabled = false; showToast('Could not save preference'); });
        });
      });

      var clear = document.getElementById('clear-preference');
      if (clear){
        clear.addEventListener('click', async function(){
          try{
            localStorage.removeItem('preferred_store');
            await fetch('/api/preferred-store', { method: 'DELETE' });
            document.cookie = 'preferred_store=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
            highlightPreferred(); showBadges(); showToast('Preferred store cleared');
          }catch(e){ showToast('Could not clear preference'); }
        });
      }

    }catch(e){}
  });

  function showBadges(){ try{ var pref = getPreferredStore(); var items = document.querySelectorAll('.shop-item'); items.forEach(function(it){ var badge = it.querySelector('.preferred-badge'); if(!badge) return; if(it.getAttribute('data-store')===pref){ badge.style.display='inline-block'; } else { badge.style.display='none'; } }); }catch(e){} }

})();
