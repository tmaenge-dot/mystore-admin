import fs from 'fs';
import path from 'path';

const DB_DIR = path.resolve('./data_store');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

function filePath(name){
  return path.join(DB_DIR, name + '.json');
}

function readJSON(name){
  const p = filePath(name);
  if (!fs.existsSync(p)) return null;
  try{ return JSON.parse(fs.readFileSync(p,'utf8')); }catch(e){ return null; }
}

function writeJSON(name, obj){
  const p = filePath(name);
  fs.writeFileSync(p, JSON.stringify(obj, null, 2), 'utf8');
}

export function getCart(storeId){
  return readJSON('cart_' + storeId) || { items: [], updatedAt: null };
}

export function saveCart(storeId, cart){
  const c = { items: cart.items || [], updatedAt: new Date().toISOString() };
  writeJSON('cart_' + storeId, c);
  return c;
}

export function listOrders(storeId){
  return readJSON('orders_' + storeId) || [];
}

export function addOrder(storeId, order){
  const orders = listOrders(storeId);
  orders.push(order);
  writeJSON('orders_' + storeId, orders);
  return order;
}

export function getOrder(storeId, orderId){
  const orders = listOrders(storeId);
  return orders.find(o => String(o.id) === String(orderId)) || null;
}

export function deleteCart(storeId){
  const p = filePath('cart_' + storeId);
  try{ if (fs.existsSync(p)) fs.unlinkSync(p); return true; }catch(e){ return false; }
}

export function deleteOrder(storeId, orderId){
  const orders = listOrders(storeId).filter(o => String(o.id) !== String(orderId));
  writeJSON('orders_' + storeId, orders);
  return true;
}

export function auditLog(entry){
  // append a JSON line to audit.log in DB_DIR
  const p = path.join(DB_DIR, 'audit.log');
  try{
    const line = JSON.stringify(Object.assign({ ts: new Date().toISOString() }, entry)) + '\n';
    fs.appendFileSync(p, line, 'utf8');
    return true;
  }catch(e){
    return false;
  }
}

export function getPromo(storeId){
  return readJSON('promo_' + storeId) || { enabled: false, text: '', startsAt: null, endsAt: null };
}

export function setPromo(storeId, promo){
  const p = {
    enabled: !!(promo && promo.enabled),
    text: (promo && promo.text) || '',
    startsAt: (promo && promo.startsAt) || null,
    endsAt: (promo && promo.endsAt) || null
  };
  writeJSON('promo_' + storeId, p);
  return p;
}

export function getImageMap(storeId){
  return readJSON('images_' + storeId) || {};
}

export function setImageMap(storeId, map){
  writeJSON('images_' + storeId, map || {});
  // debug: record that setImageMap was called (for tests) — only write when DEBUG_LOGS=1
  try{ if (process.env.DEBUG_LOGS === '1') fs.appendFileSync(path.join(DB_DIR, 'db_debug.log'), JSON.stringify({ action: 'setImageMap', storeId, map, ts: new Date().toISOString() }) + '\n'); }catch(e){}
  return map || {};
}

export default { getCart, saveCart, listOrders, addOrder, getOrder, deleteCart, deleteOrder, auditLog, getPromo, setPromo, getImageMap, setImageMap };
