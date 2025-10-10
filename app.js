import express from "express";
import cors from "cors";
import stores from "./data/stores.js";
import products from "./data/products.js";
import db from "./lib/db.js";
import session from 'express-session';
import SQLiteStoreFactory from 'connect-sqlite3';
import csurf from 'csurf';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import sharp from 'sharp';
const SQLiteStore = SQLiteStoreFactory(session);

const app = express();
app.use(cors());
app.use(express.json());
// Serve static assets from public/
app.use(express.static('public'));

// Sessions: express-session with SQLite-backed store (persistent across restarts)
const SESSION_SECRET = process.env.SESSION_SECRET || 'change_this_in_prod';
app.use(session({
  store: new SQLiteStore({ db: 'sessions.sqlite', dir: './data_store' }),
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 } // 1 day
}));

// CSRF protection (requires sessions)
const csrfProtection = csurf({ cookie: false });

// (no test-only CSRF bypass) - CSRF is enforced for admin routes

// protect admin pages middleware
function requireAdmin(req, res, next){
  // Require a logged-in admin session for /admin pages. Tests should authenticate via /admin/login.
  if (req.path.startsWith('/admin')){
    if (req.path.startsWith('/admin/login') || req.path.startsWith('/admin/logout')) return next();
    if (req.session && req.session.user) return next();
    return res.redirect('/admin/login');
  }
  next();
}
app.use(requireAdmin);

// login page
// login page with CSRF token
app.get('/admin/login', csrfProtection, (req, res) => {
  const token = req.csrfToken();
  res.send(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Login</title><link rel="stylesheet" href="/styles.css"></head><body><main><h1>Admin Login</h1><form method="post" action="/admin/login"><input type="hidden" name="_csrf" value="${token}"><label>Username <input name="user"></label><br><label>Password <input name="pass" type="password"></label><br><button type="submit">Login</button></form></main></body></html>`);
});

// Parse urlencoded bodies for login
// parse urlencoded bodies (needed for forms)
app.use(express.urlencoded({ extended: false }));

// admin image set will accept image URLs (no file uploads here)

app.post('/admin/login', csrfProtection, (req, res) => {
  const user = (req.body && req.body.user) || '';
  const pass = (req.body && req.body.pass) || '';
  const expectedUser = process.env.ADMIN_USER || 'admin';
  const expectedPass = process.env.ADMIN_PASS || 'admin';
  if (user === expectedUser && pass === expectedPass){
    req.session.user = user;
    // make sure session is saved before redirecting so subsequent CSRF token requests see the session
    return req.session.save ? req.session.save(() => res.redirect('/admin')) : res.redirect('/admin');
  }
  return res.status(401).send('Invalid credentials');
});

app.get('/admin/logout', (req, res) => { req.session.destroy(()=>{}); res.redirect('/admin/login'); });

// Development: relaxed Content-Security-Policy to allow images from self and data: URIs
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; img-src 'self' data:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
    );
    next();
  });
}

// Serve a no-content favicon to avoid 404 + CSP console messages in browsers
app.get('/favicon.ico', (req, res) => {
  // Small SVG favicon (inline) — returns a tiny red square circle icon
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
    <rect width="64" height="64" rx="12" fill="` + (process.env.FAV_COLOR || '#e53935') + `" />
    <circle cx="32" cy="32" r="14" fill="#fff" />
  </svg>`;
  res.setHeader('Content-Type', 'image/svg+xml');
  res.send(svg);
});

// Root: keep a small landing page
app.get("/", (req, res) => {
  res.send(`<!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>Mystore Admin</title>
      </head>
      <body>
        <h1>Mystore Admin Backend</h1>
        <p>Use the API at <code>/api/stores</code> or open a store at <code>/stores/:id</code>.</p>
      </body>
    </html>`);
});

// Health
app.get('/api/health', (req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

// Stores list
app.get('/api/stores', (req, res) => {
  res.json(stores);
});

// Single store metadata
app.get('/api/stores/:id', (req, res) => {
  const store = stores.find(s => s.id === req.params.id || s.slug === req.params.id);
  if (!store) return res.status(404).json({ error: 'store not found' });
  res.json(store);
});

// Admin: list stores and per-store management pages
app.get('/admin', csrfProtection, (req, res) => {
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Admin</title><link rel="stylesheet" href="/styles.css"></head><body><header><h1>Admin Dashboard</h1></header><main class="admin"><nav><a href="/admin/audit">Audit Log</a></nav><ul>${stores.map(s=>`<li><a href="/admin/stores/${s.id}">${s.name}</a></li>`).join('')}</ul></main></body></html>`;
  res.send(html);
});

app.get('/admin/stores/:id', csrfProtection, (req, res) => {
  const id = req.params.id;
  const store = stores.find(s => s.id === id || s.slug === id);
  if (!store) return res.status(404).send('<h1>Store not found</h1>');
  const cart = db.getCart(id) || { items: [] };
  const orders = db.listOrders(id) || [];
  // include CSRF token in forms
  const token = (req.csrfToken && req.csrfToken()) || '';
  const promo = db.getPromo(id) || { enabled:false, text:'' };
  const imageMap = db.getImageMap(id) || {};
  const imagesHtml = Object.entries(imageMap).map(([pid, url]) => `<li>${pid} — <img src="${url}" style="height:32px;vertical-align:middle"> <form method="post" action="/admin/stores/${id}/images/${encodeURIComponent(pid)}/delete" style="display:inline"><input type="hidden" name="_csrf" value="${token}"><button type="submit">Delete</button></form></li>`).join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Admin - ${store.name}</title><link rel="stylesheet" href="/styles.css"></head><body><header><h1>Admin - ${store.name}</h1></header><main class="admin"><section><h2>Cart</h2><pre>${JSON.stringify(cart,null,2)}</pre><form method="post" action="/admin/stores/${id}/cart/delete"><input type="hidden" name="_csrf" value="${token}"><button type="submit">Clear Cart</button></form></section><section><h2>Orders</h2><table><thead><tr><th>Order</th><th>Created</th><th>Total</th><th>Action</th></tr></thead><tbody>${orders.map(o=>`<tr><td>${o.id}</td><td>${o.createdAt}</td><td>$${(o.total||0).toFixed(2)}</td><td><form method="post" action="/admin/stores/${id}/orders/${o.id}/delete"><input type="hidden" name="_csrf" value="${token}"><button type="submit">Delete</button></form></td></tr>`).join('')}</tbody></table></section><section><h2>Promo / Ribbon</h2><form method="post" action="/admin/stores/${id}/promo"><input type="hidden" name="_csrf" value="${token}"><label><input type="checkbox" name="enabled" ${promo.enabled? 'checked': ''}> Enabled</label><br><label>Text <input name="text" value="${(promo.text||'').replace(/"/g,'&quot;')}"></label><br><label>Starts At <input name="startsAt" type="datetime-local" value="${promo.startsAt || ''}"></label><br><label>Ends At <input name="endsAt" type="datetime-local" value="${promo.endsAt || ''}"></label><br><button type="submit">Save Promo</button></form></section><section><h2>Product images</h2><form method="post" action="/admin/stores/${id}/upload" enctype="multipart/form-data"><input type="hidden" name="_csrf" value="${token}"><label>Product ID <input name="productId"></label><br><label>Image URL <input name="imageUrl" placeholder="/images/your-image.svg or https://..." ></label><br><label>Or upload file <input type="file" name="imageFile"></label><br><button type="submit">Set Image URL</button></form></section>${imagesHtml ? '<section><h3>Existing images</h3><ul>' + imagesHtml + '</ul></section>' : ''}<p><a href="/admin">Back</a></p></main></body></html>`;
  res.send(html);
});

// multer storage config: save to public/images with a safe generated filename
const imagesDir = path.join(process.cwd(), 'public', 'images');
if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });

// Allowed mime types and extensions for uploads (simple allow-list)
const ALLOWED_MIME = new Set(['image/svg+xml', 'image/png', 'image/jpeg', 'image/gif']);
const ALLOWED_EXT = new Set(['.svg', '.png', '.jpg', '.jpeg', '.gif']);

// small UUID-ish generator (no dependency)
function genId(){
  if (crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return Date.now().toString(36) + '-' + Math.floor(Math.random()*1e9).toString(36);
}

// map mime type to extension
const MIME_TO_EXT = {
  'image/svg+xml': '.svg',
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/gif': '.gif'
};

function makeSafeFilename(originalName, mimetype){
  const extFromMime = MIME_TO_EXT[mimetype] || path.extname(originalName).toLowerCase();
  const safeExt = ALLOWED_EXT.has(extFromMime) ? extFromMime : '.dat';
  return genId() + safeExt;
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, imagesDir); },
  filename: function (req, file, cb) {
    try{
      const name = makeSafeFilename(file.originalname || 'upload', file.mimetype);
      cb(null, name);
    }catch(e){ cb(e); }
  }
});

// fileFilter enforces allowed mime types
function fileFilter (req, file, cb){
  if (!file || !file.mimetype) return cb(null, false);
  if (ALLOWED_MIME.has(file.mimetype)) return cb(null, true);
  return cb(new Error('unsupported file type'), false);
}

const upload = multer({ storage: storage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter });

// Admin file upload (multipart) - saves file and maps it to a productId
const isTestRunner = (process.env.NODE_ENV === 'test') || (process.execArgv && process.execArgv.indexOf('--test') !== -1);
const uploadMiddleware = [upload.single('imageFile'), csrfProtection];
app.post('/admin/stores/:id/upload', ...uploadMiddleware, async (req, res) => {
  const id = req.params.id;
  const productId = req.body.productId;
  // if a file was provided, use its path; otherwise fallback to imageUrl
  const file = req.file;
  let imageUrl = (req.body.imageUrl || '').trim();
  if (file){ imageUrl = '/images/' + path.basename(file.path); }
  // debug: write upload info to data_store for test inspection (only when DEBUG_LOGS=1)
  try{ if (process.env.DEBUG_LOGS === '1') { const dbg = path.join(process.cwd(), 'data_store', 'upload_debug.log'); fs.appendFileSync(dbg, JSON.stringify({ productId, file: file && { originalname: file.originalname, path: file && file.path } , time: new Date().toISOString() }) + '\n'); } }catch(e){}
  // If a file was uploaded, validate/process it using sharp (resize) and fail if invalid
  if (file){
    const fp = file.path;
    try{
      // load with sharp to validate image, resize to max width 1200 while keeping aspect ratio, overwrite file
      await sharp(fp).resize({ width: 1200, withoutEnlargement: true }).toFile(fp + '.tmp');
      // replace original
      fs.renameSync(fp + '.tmp', fp);
      imageUrl = '/images/' + path.basename(fp);
    }catch(err){
      // cleanup and return error
      try{ if (fs.existsSync(fp)) fs.unlinkSync(fp); }catch(e){}
      return res.status(400).send({ error: 'invalid image upload' });
    }
  }
  if (!imageUrl || !productId) return res.status(400).send('imageUrl and productId required');
  const map = db.getImageMap(id) || {};
  map[productId] = imageUrl;
  db.setImageMap(id, map);
  if (Array.isArray(products[id])){
    const p = products[id].find(x=>x.id===productId);
    if (p) p.image = imageUrl;
  }
  db.auditLog({ action: 'set_image', store: id, user: (req.session && req.session.user) || 'unknown', productId, file: imageUrl });
  res.redirect('/admin/stores/' + id);
});

// (test-only helper removed) Tests should use the real /admin/login flow to obtain a session and CSRF token.


// (old non-multipart upload handler removed — multer-based handler above handles both URL and file uploads)

// Admin image delete handler
const deleteMiddleware = [csrfProtection];
app.post('/admin/stores/:id/images/:productId/delete', ...deleteMiddleware, (req, res) => {
  const id = req.params.id;
  const productId = req.params.productId;
  const map = db.getImageMap(id) || {};
  if (map && map[productId]) {
    delete map[productId];
    db.setImageMap(id, map);
    if (Array.isArray(products[id])){
      const p = products[id].find(x=>x.id===productId);
      if (p) p.image = undefined;
    }
    db.auditLog({ action: 'delete_image', store: id, user: (req.session && req.session.user) || 'unknown', productId });
  }
  res.redirect('/admin/stores/' + id);
});

// Admin promo POST handler
app.post('/admin/stores/:id/promo', csrfProtection, (req, res) => {
  const id = req.params.id;
  const enabled = !!req.body.enabled;
  const text = (req.body.text || '').trim();
  db.setPromo(id, { enabled, text });
  db.auditLog({ action: 'set_promo', store: id, user: (req.session && req.session.user) || 'unknown', promo: { enabled, text } });
  res.redirect('/admin/stores/' + id);
});

// Admin actions (POST forms)
app.post('/admin/stores/:id/cart/delete', csrfProtection, (req, res) => {
  const id = req.params.id;
  db.deleteCart(id);
  db.auditLog({ action: 'clear_cart', store: id, user: (req.session && req.session.user) || 'unknown' });
  res.redirect('/admin/stores/' + id);
});

app.post('/admin/stores/:id/orders/:orderId/delete', csrfProtection, (req, res) => {
  const id = req.params.id;
  const orderId = req.params.orderId;
  db.deleteOrder(id, orderId);
  db.auditLog({ action: 'delete_order', store: id, orderId, user: (req.session && req.session.user) || 'unknown' });
  res.redirect('/admin/stores/' + id);
});

// Audit log viewer (shows latest lines)
app.get('/admin/audit', (req, res) => {
  const p = './data_store/audit.log';
  const fs = require('fs');
  if (!fs.existsSync(p)) return res.send('<h1>Audit log empty</h1><p><a href="/admin">Back</a></p>');
  const raw = fs.readFileSync(p, 'utf8').trim().split('\n').filter(Boolean).reverse();
  // show up to 200 recent entries
  const entries = raw.slice(0, 200).map(l => {
    try{ return JSON.parse(l); }catch(e){ return { raw: l }; }
  });
  const rows = entries.map(e => `<tr><td>${e.ts||''}</td><td>${e.user||''}</td><td>${e.action||''}</td><td><pre>${JSON.stringify(e, null, 2)}</pre></td></tr>`).join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Audit Log</title><link rel="stylesheet" href="/styles.css"></head><body><header><h1>Audit Log</h1></header><main class="admin"><table><thead><tr><th>When</th><th>User</th><th>Action</th><th>Detail</th></tr></thead><tbody>${rows}</tbody></table><p><a href="/admin">Back</a></p></main></body></html>`;
  res.send(html);
});

// Products for a store
app.get('/api/stores/:id/products', (req, res) => {
  const id = req.params.id;
  const items = products[id];
  if (!items) return res.status(404).json({ error: 'no products for store' });
  res.json(items);
});

// Price preview endpoint: returns unit price and line total for a product/qty using server logic
app.get('/api/stores/:id/price', (req, res) => {
  const id = req.params.id;
  const productId = req.query.productId;
  const qty = Number(req.query.qty) || 0;
  const storeProducts = products[id] || [];
  const p = storeProducts.find(sp => sp.id === productId);
  if (!p) return res.status(404).json({ error: 'product not found' });
  let unitPrice = p.price || 0;
  if (Array.isArray(p.bulkPricing) && p.bulkPricing.length){
    const tiers = p.bulkPricing.slice().sort((a,b)=>a.minQty-b.minQty);
    for (let t of tiers){ if (qty >= t.minQty) unitPrice = t.price; }
  }
  res.json({ productId, qty, unitPrice, lineTotal: unitPrice * qty });
});

// Product detail
app.get('/api/stores/:id/products/:productId', (req, res) => {
  const { id, productId } = req.params;
  const items = products[id];
  if (!items) return res.status(404).json({ error: 'no products for store' });
  const p = items.find(it => it.id === productId);
  if (!p) return res.status(404).json({ error: 'product not found' });
  res.json(p);
});

// Simple in-memory carts (per-store, ephemeral)
const carts = {}; // { storeId: { items: [{id,qty}], updatedAt } }

app.get('/api/stores/:id/cart', (req, res) => {
  const id = req.params.id;
  const cart = db.getCart(id);
  res.json(cart);
});

app.post('/api/stores/:id/cart', (req, res) => {
  const id = req.params.id;
  const body = req.body || {};
  // Expect body.items = [{ id, qty }]
  if (!Array.isArray(body.items)) return res.status(400).json({ error: 'items array required' });
  const saved = db.saveCart(id, { items: body.items });
  res.status(201).json(saved);
});

// Orders
app.get('/api/stores/:id/orders', (req, res) => {
  const id = req.params.id;
  const orders = db.listOrders(id);
  res.json(orders);
});

app.post('/api/stores/:id/orders', (req, res) => {
  const id = req.params.id;
  const body = req.body || {};
  if (!body || !Array.isArray(body.items)) return res.status(400).json({ error: 'order items required' });
  // Enrich items with product data and compute line totals
  const storeProducts = products[id] || [];
  // server-side bulk pricing: pick tiered price based on qty if present
  const enriched = body.items.map(it => {
    const p = storeProducts.find(sp => sp.id === it.id) || { name: it.id, price: 0 };
    const qty = Number(it.qty) || 0;
    let unitPrice = p.price || 0;
    if (Array.isArray(p.bulkPricing) && p.bulkPricing.length){
      // choose best matching tier (largest minQty <= qty)
      const tiers = p.bulkPricing.slice().sort((a,b)=>a.minQty-b.minQty);
      for (let t of tiers){ if (qty >= t.minQty) unitPrice = t.price; }
    }
    return { id: it.id, name: p.name, price: unitPrice, qty, lineTotal: unitPrice * qty };
  });
  const total = enriched.reduce((s, i) => s + (i.lineTotal || 0), 0);
  const order = { id: Date.now().toString(36), items: enriched, total, createdAt: new Date().toISOString() };
  db.addOrder(id, order);
  res.status(201).json(order);
});

// Checkout endpoint (simulated payment)
app.post('/api/stores/:id/checkout', (req, res) => {
  const id = req.params.id;
  const body = req.body || {};
  if (!body || !Array.isArray(body.items)) return res.status(400).json({ error: 'order items required' });
  // very small simulated payment validation: accept if payment.token === 'tok_test' or no payment provided (demo)
  const payment = body.payment || {};
  if (payment.token && payment.token !== 'tok_test') return res.status(402).json({ error: 'payment declined' });

  const storeProducts = products[id] || [];
  // server-side bulk pricing applied at checkout too
  const enriched = body.items.map(it => {
    const p = storeProducts.find(sp => sp.id === it.id) || { name: it.id, price: 0 };
    const qty = Number(it.qty) || 0;
    let unitPrice = p.price || 0;
    if (Array.isArray(p.bulkPricing) && p.bulkPricing.length){
      const tiers = p.bulkPricing.slice().sort((a,b)=>a.minQty-b.minQty);
      for (let t of tiers){ if (qty >= t.minQty) unitPrice = t.price; }
    }
    return { id: it.id, name: p.name, price: unitPrice, qty, lineTotal: unitPrice * qty };
  });
  const total = enriched.reduce((s, i) => s + (i.lineTotal || 0), 0);
  const order = { id: Date.now().toString(36), items: enriched, total, createdAt: new Date().toISOString() };
  db.addOrder(id, order);
  res.status(201).json(order);
});

// Get single order
app.get('/api/stores/:id/orders/:orderId', (req, res) => {
  const id = req.params.id;
  const orderId = req.params.orderId;
  const order = db.getOrder(id, orderId);
  if (!order) return res.status(404).json({ error: 'order not found' });
  res.json(order);
});

// Serve a simple responsive store page (mobile-first)
app.get('/stores/:id', (req, res) => {
  const id = req.params.id;
  const store = stores.find(s => s.id === id || s.slug === id);
  if (!store) return res.status(404).send('<h1>Store not found</h1>');

  // per-store branding
  const brandColor = store.brandColor || '#222';
  const logoUrl = `/images/${store.slug || id}.svg`;
  const promo = db.getPromo(id) || { enabled: false, text: '' };

  // build a safe HTML string without nested template literal complexity
  const html = `<!doctype html>
  <html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${store.name || ''}</title>
    <style>:root{--brand-color:${brandColor}}</style>
    <link rel="stylesheet" href="/styles.css">
  </head>
  <body>
    <header class="store-header">
      <div class="hero">
        <div class="hero-inner">
          <img class="logo" src="${logoUrl}" alt="${store.name || ''} logo" onerror="this.style.display='none'">
          <div>
            <h1>${store.name || ''}</h1>
            <p class="tag">${store.description || ''}</p>
            <p><a class="brand-btn" href="#products" onclick="document.getElementById('q').focus();return false">Shop now</a></p>
          </div>
        </div>
      </div>
      ${promo.enabled ? `<div class="promo-ribbon">${promo.text}</div>` : ''}
    </header>
    <div class="search"><input id="q" placeholder="Search products"/></div>
    <main>
      <section id="products" class="grid"></section>
    </main>
  <div class="cartbar" id="cartbar">Cart: <span id="cart-count">0</span> • <button id="view-cart" class="brand-link">View</button></div>

    <!-- Modals -->
    <div id="modal-backdrop" class="modal-backdrop">
      <div id="modal" class="modal" role="dialog" aria-modal="true">
        <button class="close" id="modal-close">✕</button>
        <div id="modal-body"></div>
      </div>
    </div>

    <div id="cart-backdrop" class="modal-backdrop">
      <div id="cart-modal" class="modal" role="dialog" aria-modal="true">
        <button class="close" id="cart-close">✕</button>
        <h3>Your Cart</h3>
        <ul id="cart-list" class="cart-list"></ul>
        <div style="margin-top:12px;text-align:right"><strong>Total: $<span id="cart-total">0.00</span></strong></div>
        <div style="margin-top:12px;text-align:right"><button id="save-server">Save</button> <button id="do-checkout">Checkout</button></div>
      </div>
    </div>

    <script>
      const storeId = ${JSON.stringify(id)};
      let products = [];
      function saveCart(c){ localStorage.setItem('cart:'+storeId, JSON.stringify(c)); }
      function loadCart(){ try{ return JSON.parse(localStorage.getItem('cart:'+storeId)) || {items:[]}; }catch(e){return {items:[]};} }
      function updateCartUI(){ var c = loadCart(); var count = c.items.reduce(function(s,i){return s + (i.qty||0);}, 0); document.getElementById('cart-count').textContent = count; }
      async function fetchProducts(){ var res = await fetch('/api/stores/' + storeId + '/products'); products = await res.json(); render(products); updateCartUI(); }
      function render(list){ var out = ''; for(var i=0;i<list.length;i++){ var it = list[i]; out += '<div class="card" data-id="'+it.id+'">' + '<div class="thumb" data-id="'+it.id+'" style="width:100%;height:96px;display:flex;align-items:center;justify-content:center">' + (it.image?('<img src="'+it.image+'" alt="'+(it.name||'')+'">'):'') + '</div>' + '<div class="meta"><div>'+ (it.name||'') +'</div><div class="price">$'+(typeof it.price==='number'?it.price.toFixed(2):it.price) +'</div></div><div style="margin-top:8px"><button class="add" data-id="'+it.id+'">Add</button> <button class="view" data-id="'+it.id+'">View</button></div></div>'; } document.getElementById('products').innerHTML = out; bindAdd(); bindView(); }
  function render(list){ var out = ''; for(var i=0;i<list.length;i++){ var it = list[i]; var bulkHtml = ''; if(Array.isArray(it.bulkPricing) && it.bulkPricing.length){ bulkHtml = '<div class="bulk">'; for(var b=0;b<it.bulkPricing.length;b++){ var tier = it.bulkPricing[b]; bulkHtml += '<div class="tier">Buy '+tier.minQty+'+ @ $'+tier.price.toFixed(2)+'</div>'; } bulkHtml += '</div>'; } out += '<div class="card" data-id="'+it.id+'">' + '<div class="thumb" data-id="'+it.id+'" style="width:100%;height:96px;display:flex;align-items:center;justify-content:center">' + (it.image?('<img src="'+it.image+'" alt="'+(it.name||'')+'">'):'') + '</div>' + '<div class="meta"><div>'+ (it.name||'') +'</div><div class="price">$'+(typeof it.price==='number'?it.price.toFixed(2):it.price) +'</div>'+bulkHtml+'</div><div style="margin-top:8px"><button class="add" data-id="'+it.id+'">Add</button> <button class="view" data-id="'+it.id+'">View</button></div></div>'; } document.getElementById('products').innerHTML = out; bindAdd(); bindView(); }
      function bindAdd(){ var buttons = document.querySelectorAll('.add'); for(var j=0;j<buttons.length;j++){ (function(b){ b.onclick=function(){ var id=b.getAttribute('data-id'); var c=loadCart(); var ex=null; for(var k=0;k<c.items.length;k++){ if(c.items[k].id===id) { ex=c.items[k]; break; } } if(ex) ex.qty+=1; else c.items.push({id:id,qty:1}); saveCart(c); updateCartUI(); }; })(buttons[j]); } }
      function bindView(){ var buttons = document.querySelectorAll('.view, .thumb'); for(var j=0;j<buttons.length;j++){ (function(b){ b.onclick=function(){ var id=b.getAttribute('data-id'); openProduct(id); }; })(buttons[j]); } }

      function openProduct(id){ var p = products.find(function(x){return x.id===id}); if(!p) return; var body = document.getElementById('modal-body'); body.innerHTML = '<h2>'+ (p.name||'') +'</h2><div style="display:flex;gap:12px"><div style="flex:1">'+(p.image?'<img src="'+p.image+'" style="max-width:180px">':'')+'</div><div style="flex:2"><p>'+ (p.description||'') +'</p><p><strong>$'+(p.price?p.price.toFixed(2):'0.00')+'</strong></p><p><button id="modal-add">Add to cart</button></p></div></div>'; document.getElementById('modal-backdrop').style.display='flex'; document.getElementById('modal-close').onclick = function(){ document.getElementById('modal-backdrop').style.display='none'; }; document.getElementById('modal-body').querySelector('#modal-add').onclick = function(){ var c = loadCart(); var ex = c.items.find(function(i){return i.id===id}); if(ex) ex.qty+=1; else c.items.push({id:id,qty:1}); saveCart(c); updateCartUI(); document.getElementById('modal-backdrop').style.display='none'; } }
  function openProduct(id){ var p = products.find(function(x){return x.id===id}); if(!p) return; var body = document.getElementById('modal-body'); var bulkHtml=''; if(Array.isArray(p.bulkPricing) && p.bulkPricing.length){ bulkHtml='<div class="bulk-modal"><strong>Bulk pricing:</strong><ul>'; for(var i=0;i<p.bulkPricing.length;i++){ var t=p.bulkPricing[i]; bulkHtml+='<li>Buy '+t.minQty+'+ @ $'+t.price.toFixed(2)+'</li>'; } bulkHtml+='</ul></div>'; } body.innerHTML = '<h2>'+ (p.name||'') +'</h2><div style="display:flex;gap:12px"><div style="flex:1">'+(p.image?'<img src="'+p.image+'" style="max-width:180px">':'')+'</div><div style="flex:2"><p>'+ (p.description||'') +'</p><p><strong>$'+(p.price?p.price.toFixed(2):'0.00')+'</strong></p>'+bulkHtml+'<p><button id="modal-add">Add to cart</button></p></div></div>'; document.getElementById('modal-backdrop').style.display='flex'; document.getElementById('modal-close').onclick = function(){ document.getElementById('modal-backdrop').style.display='none'; }; document.getElementById('modal-body').querySelector('#modal-add').onclick = function(){ var c = loadCart(); var ex = c.items.find(function(i){return i.id===id}); if(ex) ex.qty+=1; else c.items.push({id:id,qty:1}); saveCart(c); updateCartUI(); document.getElementById('modal-backdrop').style.display='none'; } }

      document.getElementById('q').addEventListener('input', function(e){ var q = e.target.value.toLowerCase(); render(products.filter(function(p){ return p.name.toLowerCase().includes(q) || (p.category||'').toLowerCase().includes(q); })); });
      document.getElementById('view-cart').addEventListener('click', function(){ showCart(); });
      document.getElementById('cart-close').onclick = function(){ document.getElementById('cart-backdrop').style.display='none'; };

      async function showCart(){ var c = loadCart(); var list = document.getElementById('cart-list'); list.innerHTML=''; var total=0; if (!c.items.length){ document.getElementById('cart-total').textContent = '0.00'; document.getElementById('cart-backdrop').style.display='flex'; return; }
        // batch price lookups per unique product
        var lookups = {};
        for(var i=0;i<c.items.length;i++){ lookups[c.items[i].id] = true; }
        var prices = {};
        var ids = Object.keys(lookups);
        await Promise.all(ids.map(async function(pid){ try{ var r = await fetch('/api/stores/'+storeId+'/price?productId='+encodeURIComponent(pid)+'&qty=1'); if(r.ok){ var j = await r.json(); prices[pid] = j.unitPrice; } }catch(e){} }));
        for(var i=0;i<c.items.length;i++){ var it = c.items[i]; var prod = products.find(function(p){return p.id===it.id}) || {name:it.id}; var unit = typeof prices[it.id]==='number'? prices[it.id] : (prod.price||0); var line = (unit||0) * (it.qty||0); total += line; var li = document.createElement('li'); li.innerHTML = '<div>'+(prod.name||it.id)+' <small style="color:#666">x'+(it.qty||0)+'</small></div><div>$'+ line.toFixed(2) +' <small style="color:#666">( $'+unit.toFixed(2)+'/ea )</small> <button class="inc" data-id="'+it.id+'">+</button> <button class="dec" data-id="'+it.id+'">-</button> <button class="rm" data-id="'+it.id+'">Remove</button></div>'; list.appendChild(li); }
        document.getElementById('cart-total').textContent = total.toFixed(2);
        // bind inc/dec/rm
        Array.from(document.querySelectorAll('#cart-list .inc')).forEach(function(b){ b.onclick=function(){ var id=b.getAttribute('data-id'); var c=loadCart(); var it = c.items.find(function(x){return x.id===id}); if(it){ it.qty = (it.qty||0)+1; saveCart(c); showCart(); updateCartUI(); } }; });
        Array.from(document.querySelectorAll('#cart-list .dec')).forEach(function(b){ b.onclick=function(){ var id=b.getAttribute('data-id'); var c=loadCart(); var it = c.items.find(function(x){return x.id===id}); if(it){ it.qty = Math.max(0, (it.qty||0)-1); if(it.qty===0){ c.items = c.items.filter(function(x){return x.id!==id}); } saveCart(c); showCart(); updateCartUI(); } }; });
        Array.from(document.querySelectorAll('#cart-list .rm')).forEach(function(b){ b.onclick=function(){ var id=b.getAttribute('data-id'); var c=loadCart(); c.items = c.items.filter(function(x){return x.id!==id}); saveCart(c); showCart(); updateCartUI(); }; });
        document.getElementById('cart-backdrop').style.display='flex';
      }

  document.getElementById('save-server').onclick = async function(){ var c=loadCart(); const res = await fetch('/api/stores/'+storeId+'/cart',{method:'POST',headers:{'Content-Type':'application/json'}, body:JSON.stringify({ items: c.items })}); if(res.ok) alert('Saved server-side'); else alert('Save failed'); };

      document.getElementById('do-checkout').onclick = async function(){ var c=loadCart(); if(!c.items.length) return alert('Cart empty'); var res = await fetch('/api/stores/'+storeId+'/checkout',{method:'POST',headers:{'Content-Type':'application/json'}, body:JSON.stringify({ items: c.items, payment: { token: 'tok_test' } })}); if(res.ok){ var order = await res.json(); localStorage.removeItem('cart:'+storeId); window.location = '/stores/' + storeId + '/orders/' + order.id; } else { var text = await res.json(); alert('Checkout failed: ' + (text && text.error || 'unknown')); } };

  fetchProducts();
    </script>
  </body>
  </html>`;

  res.send(html);
});

// Cart page — shows client cart and can save to server
app.get('/stores/:id/cart', (req, res) => {
  const id = req.params.id;
  const store = stores.find(s => s.id === id || s.slug === id);
  if (!store) return res.status(404).send('<h1>Store not found</h1>');

  const html = `<!doctype html>
  <html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${store.name} — Cart</title>
    <link rel="stylesheet" href="/styles.css">
  </head>
  <body>
    <header><div class="logo"></div><div><h1>${store.name} — Cart</h1></div></header>
    <main style="padding:12px">
      <div id="cart-contents">Loading cart…</div>
      <div style="margin-top:12px"><button id="save">Save cart to server</button></div>
    </main>
    <script>
      const storeId = ${JSON.stringify(id)};
      function loadCart(){ try{ return JSON.parse(localStorage.getItem('cart:'+storeId)) || {items:[]}; }catch(e){return {items:[]};} }
      async function render(){ const c = loadCart(); if(!c.items.length){ document.getElementById('cart-contents').textContent = 'Cart is empty'; return; }
        // fetch product catalog to resolve names and default prices
        var res = await fetch('/api/stores/' + storeId + '/products'); var catalog = [];
        if (res.ok) catalog = await res.json();
        // for each line, ask server for the unit price for the qty
        var lines = await Promise.all(c.items.map(async function(it){ var r = await fetch('/api/stores/'+storeId+'/price?productId='+encodeURIComponent(it.id)+'&qty='+encodeURIComponent(it.qty||0)); if(r.ok){ var j = await r.json(); return { id: it.id, qty: it.qty, unitPrice: j.unitPrice, lineTotal: j.lineTotal, name: (catalog.find(p=>p.id===it.id) || {}).name || it.id }; } return { id: it.id, qty: it.qty, unitPrice: 0, lineTotal: 0, name: it.id }; }));
        var total = lines.reduce((s,l)=>s+(l.lineTotal||0),0);
        var out = '<ul>' + lines.map(l=>'<li>'+l.name+' x'+l.qty+' — $'+(l.lineTotal||0).toFixed(2)+' <small>( $'+(l.unitPrice||0).toFixed(2)+'/ea )</small></li>').join('') + '</ul><div style="margin-top:12px"><strong>Total: $'+ total.toFixed(2) +'</strong></div>';
        document.getElementById('cart-contents').innerHTML = out;
      }
      document.getElementById('save').addEventListener('click', async ()=>{
        const c = loadCart();
        const res = await fetch('/api/stores/' + storeId + '/cart', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ items: c.items }) });
        if (res.ok) alert('Saved'); else alert('Save failed');
      });
      // Checkout: post order and redirect to confirmation
      document.getElementById('save').insertAdjacentHTML('afterend', '<button id="checkout" style="margin-left:12px">Checkout</button>');
      document.getElementById('checkout').addEventListener('click', async ()=>{
        const c = loadCart();
        if (!c.items.length) return alert('Cart empty');
        const total = c.items.reduce((s,i)=>s + ((i.qty||0) * 1), 0); // sample total calculation (replace with prices)
        const res = await fetch('/api/stores/' + storeId + '/orders', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ items: c.items, total }) });
        if (res.ok){ const order = await res.json(); localStorage.removeItem('cart:'+storeId); window.location = '/stores/' + storeId + '/orders/' + order.id; } else { alert('Checkout failed'); }
      });
      render();
    </script>
  </body>
  </html>`;

  res.send(html);
});

// Order confirmation page
app.get('/stores/:id/orders/:orderId', (req, res) => {
  const id = req.params.id;
  const orderId = req.params.orderId;
  const store = stores.find(s => s.id === id || s.slug === id);
  if (!store) return res.status(404).send('<h1>Store not found</h1>');
  const order = db.getOrder(id, orderId);
  if (!order) return res.status(404).send('<h1>Order not found</h1>');

  const html = `<!doctype html>
  <html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Order ${order.id} — ${store.name}</title>
    <link rel="stylesheet" href="/styles.css">
  </head>
  <body>
    <header><div class="logo"></div><div><h1>Thanks — Order ${order.id}</h1></div></header>
    <main style="padding:12px">
      <p>Your order was placed on ${order.createdAt}.</p>
      <h3>Items</h3>
      <ul>
        ${order.items.map(i => `<li>${i.name} — ${i.qty} × $${(i.price||0).toFixed(2)} = $${(i.lineTotal||0).toFixed(2)}</li>`).join('')}
      </ul>
      <h3>Total: $${(order.total||0).toFixed(2)}</h3>
      <p><a href="/stores/${id}">Back to store</a></p>
    </main>
  </body>
  </html>`;

  res.send(html);
});

export default app;

// simple error handler for file upload errors
app.use((err, req, res, next) => {
  if (!err) return next();
  // Multer errors or our fileFilter 'unsupported file type' should return 400
  if (err && (err.message && (err.message.includes('unsupported file type') || err.message.includes('File too large') || err.code === 'LIMIT_FILE_SIZE'))){
    return res.status(400).send({ error: String(err.message) });
  }
  // fallback: internal server error
  console.error('Unhandled error', err && err.stack || err);
  res.status(500).send({ error: 'internal error' });
});
