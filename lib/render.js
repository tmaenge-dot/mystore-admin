export function fmtCurrency(amount){
  try{ return new Intl.NumberFormat('en-BW', { style: 'currency', currency: 'BWP', maximumFractionDigits: 2 }).format(Number(amount)); }catch(e){ return 'BWP ' + (typeof amount === 'number' ? amount.toFixed(2) : (amount || '0.00')); }
}

export function renderProductCards(list){
  const fmt = fmtCurrency;
  return (list||[]).map(it => {
    const price = (typeof it.price === 'number') ? fmt(it.price) : it.price;
    const bulkHtml = (Array.isArray(it.bulkPricing) && it.bulkPricing.length) ? ('<div class="bulk">' + it.bulkPricing.map(b => '<div class="tier">Buy ' + b.minQty + '+ @ ' + fmt(b.price) + '</div>').join('') + '</div>') : '';
    const img = it.image ? ('<img src="' + it.image + '" alt="' + (it.name||'') + '">') : '';
    return '<div class="card" data-id="' + it.id + '">' +
      '<div class="thumb" data-id="' + it.id + '" style="width:100%;height:96px;display:flex;align-items:center;justify-content:center">' + img + '</div>' +
      '<div class="meta"><div class="name">' + (it.name||'') + '</div><div class="desc">' + (it.description||'') + '</div><div class="price">' + price + '</div>' + bulkHtml + '</div>' +
      '<div style="margin-top:8px"><button class="add" data-id="' + it.id + '">Add</button> <button class="view" data-id="' + it.id + '">View</button></div>' +
    '</div>';
  }).join('');
}
