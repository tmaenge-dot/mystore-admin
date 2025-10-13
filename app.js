import express from "express";
import cors from "cors";
import stores from "./data/stores.js";
import products from "./data/products.js";
import db from "./lib/db.js";
import { fmtCurrency, renderProductCards } from './lib/render.js';
import session from 'express-session';
import SQLiteStoreFactory from 'connect-sqlite3';
import csurf from 'csurf';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import sharp from 'sharp';
// small helper: darken a hex color by a percentage (0-1)
function hexDarken(hex, amount){
  try{
    let c = hex.replace('#',''); if(c.length===3) c = c.split('').map(ch=>ch+ch).join('');
    const num = parseInt(c,16);
    let r = (num >> 16) & 0xff;
    let g = (num >> 8) & 0xff;
    let b = num & 0xff;
    r = Math.max(0, Math.min(255, Math.floor(r * (1 - amount))));
    g = Math.max(0, Math.min(255, Math.floor(g * (1 - amount))));
    b = Math.max(0, Math.min(255, Math.floor(b * (1 - amount))));
    return '#' + ((1<<24) + (r<<16) + (g<<8) + b).toString(16).slice(1);
  }catch(e){ return hex; }
}
// small helper: lighten a hex color by a percentage (0-1)
function hexLighten(hex, amount){
  try{
    let c = hex.replace('#',''); if(c.length===3) c = c.split('').map(ch=>ch+ch).join('');
    const num = parseInt(c,16);
    let r = (num >> 16) & 0xff;
    let g = (num >> 8) & 0xff;
    let b = num & 0xff;
    r = Math.max(0, Math.min(255, Math.floor(r + (255 - r) * amount)));
    g = Math.max(0, Math.min(255, Math.floor(g + (255 - g) * amount)));
    b = Math.max(0, Math.min(255, Math.floor(b + (255 - b) * amount)));
    return '#' + ((1<<24) + (r<<16) + (g<<8) + b).toString(16).slice(1);
  }catch(e){ return hex; }
}
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

// Additional app icons (PNG and ICO) for desktop shortcuts
app.get('/mystore-icon.png', (req, res) => {
  const p = path.join(process.cwd(), 'public', 'images', 'mystore-icon-512.png');
  if (!fs.existsSync(p)) return res.status(404).send('not found');
  res.sendFile(p);
});

app.get('/mystore-icon.ico', (req, res) => {
  const p = path.join(process.cwd(), 'public', 'images', 'mystore-icon.ico');
  if (!fs.existsSync(p)) return res.status(404).send('not found');
  res.sendFile(p);
});

// Root: keep a small landing page
// Redirect root to the featured storefront for demo/pitch convenience
app.get("/", (req, res) => {
  // Default featured store can be overridden with FEATURED_STORE env var.
  // If a user has previously selected a preferred store we persist it in a cookie
  // (set by client-side JS). Honor FEATURED_STORE first, then cookie, then fallback.
  const cookieHeader = req.headers && req.headers.cookie ? req.headers.cookie : '';
  let preferred = null;
  try{
    // Prefer session-stored preference (if user saved on this browser/session)
    if (req && req.session && req.session.preferred_store) preferred = req.session.preferred_store;
    // Fallback to cookie-based preference
    if(!preferred){
      const parts = cookieHeader.split(';').map(c=>c.trim());
      const found = parts.find(p => p.startsWith('preferred_store='));
      if(found){ preferred = decodeURIComponent(found.split('=')[1] || ''); }
    }
  }catch(e){ preferred = null; }
  const featured = process.env.FEATURED_STORE || preferred || 'sefalana';
  return res.redirect(302, `/stores/${featured}`);
});

// Simple probe endpoint to verify connectivity from other devices or health checks
app.get('/probe', (req, res) => {
  res.type('text/plain').send('ok');
});

// API to set preferred store (saves to session and cookie)
app.post('/api/preferred-store', (req, res) => {
  const id = req.body && req.body.id;
  if (!id) return res.status(400).json({ error: 'missing id' });
  req.session.preferred_store = id;
  const expires = new Date(); expires.setDate(expires.getDate() + 365);
  res.cookie('preferred_store', id, { path: '/', expires });
  // persist mapping of sessionID -> preferred store for admin reporting
  try{
    const countsPath = path.join(process.cwd(), 'data_store', 'preferred_counts.json');
    let counts = {};
    if (fs.existsSync(countsPath)){
      try{ counts = JSON.parse(fs.readFileSync(countsPath, 'utf8') || '{}'); }catch(e){ counts = {}; }
    }
    counts[id] = counts[id] || { count: 0, lastUpdated: null };
    counts[id].count = (counts[id].count || 0) + 1;
    counts[id].lastUpdated = (new Date()).toISOString();
    fs.writeFileSync(countsPath, JSON.stringify(counts, null, 2));
  }catch(e){ /* ignore persistence errors */ }
  return res.json({ ok: true, id });
});

// API to clear preferred store
app.delete('/api/preferred-store', (req, res) => {
  try{ delete req.session.preferred_store; }catch(e){}
  res.clearCookie('preferred_store', { path: '/' });
  // remove from persisted mapping
  try{
    const countsPath = path.join(process.cwd(), 'data_store', 'preferred_counts.json');
    if (fs.existsSync(countsPath)){
      let counts = {};
      try{ counts = JSON.parse(fs.readFileSync(countsPath, 'utf8') || '{}'); }catch(e){ counts = {}; }
      // decrement count for this store if session had one (best-effort)
      // Note: we do not track per-session mapping anymore, so this is a no-op for now.
      fs.writeFileSync(countsPath, JSON.stringify(counts, null, 2));
    }
  }catch(e){}
  return res.json({ ok: true });
});

// Admin: view persisted preferred stores (simple report)
app.get('/admin/preferences', csrfProtection, (req, res) => {
  // requireAdmin middleware is global; this route is protected
  const countsPath = path.join(process.cwd(), 'data_store', 'preferred_counts.json');
  let counts = {};
  if (fs.existsSync(countsPath)){
    try{ counts = JSON.parse(fs.readFileSync(countsPath, 'utf8') || '{}'); }catch(e){ counts = {}; }
  }
  const countsHtml = Object.keys(counts).map(k => `<li>${k}: ${counts[k].count} (last: ${counts[k].lastUpdated})</li>`).join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Preferences</title><link rel="stylesheet" href="/styles.css"></head><body><main class="admin container"><h1>Preferred stores (aggregated)</h1><section><h2>Counts</h2><ul>${countsHtml}</ul></section><p><a href="/admin">Back</a></p></main></body></html>`;
  res.send(html);
});

// Serve the Thuso pitch HTML inline for easy viewing
app.get('/thuso_pitch', (req, res) => {
  const p = path.join(process.cwd(), 'docs', 'thuso_pitch.html');  
  
  if (!fs.existsSync(p)) return res.status(404).send('not found');
  res.type('html').send(fs.readFileSync(p, 'utf8'));
});

// Download the Thuso pitch as an attachment
app.get('/download/thuso_pitch.html', (req, res) => {
  const p = path.join(process.cwd(), 'docs', 'thuso_pitch.html');
  if (!fs.existsSync(p)) return res.status(404).send('not found');
  res.download(p, 'thuso_pitch.html');
});

// Serve generated PDF of the pitch (created via headless Chrome)
app.get('/download/thuso_pitch.pdf', (req, res) => {
  const p = path.join(process.cwd(), 'docs', 'thuso_pitch.pdf');
  if (!fs.existsSync(p)) return res.status(404).send('not found');
  res.download(p, 'thuso_pitch.pdf');
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
  if (!store) {
    const available = stores.map(s => `<li><a href="/stores/${s.id}">${s.name} — /stores/${s.id}</a></li>`).join('');
    const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Store not found</title><link rel="stylesheet" href="/styles.css"></head><body><main style="padding:18px"><h1>Store not found</h1><p>No store found for "${id}".</p><p>Available stores:</p><ul>${available}</ul><p><a href="/">Back home</a></p></main></body></html>`;
    return res.status(404).send(html);
  }
  const cart = db.getCart(id) || { items: [] };
  const orders = db.listOrders(id) || [];
  // include CSRF token in forms
  const token = (req.csrfToken && req.csrfToken()) || '';
  const promo = db.getPromo(id) || { enabled:false, text:'' };
  const imageMap = db.getImageMap(id) || {};
  const imagesHtml = Object.entries(imageMap).map(([pid, url]) => `<li>${pid} — <img src="${url}" style="height:32px;vertical-align:middle"> <form method="post" action="/admin/stores/${id}/images/${encodeURIComponent(pid)}/delete" style="display:inline"><input type="hidden" name="_csrf" value="${token}"><button type="submit">Delete</button></form></li>`).join('');
    const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Admin - ${store.name}</title><link rel="stylesheet" href="/styles.css"></head><body><header><h1>Admin - ${store.name}</h1></header><main class="admin"><section><h2>Cart</h2><pre>${JSON.stringify(cart,null,2)}</pre><form method="post" action="/admin/stores/${id}/cart/delete"><input type="hidden" name="_csrf" value="${token}"><button type="submit">Clear Cart</button></form></section><section><h2>Orders</h2><table><thead><tr><th>Order</th><th>Created</th><th>Total</th><th>Action</th></tr></thead><tbody>${orders.map(o=>`<tr><td>${o.id}</td><td>${o.createdAt}</td><td>BWP ${(o.total||0).toFixed(2)}</td><td><form method="post" action="/admin/stores/${id}/orders/${o.id}/delete"><input type="hidden" name="_csrf" value="${token}"><button type="submit">Delete</button></form></td></tr>`).join('')}</tbody></table></section><section><h2>Promo / Ribbon</h2><form method="post" action="/admin/stores/${id}/promo"><input type="hidden" name="_csrf" value="${token}"><label><input type="checkbox" name="enabled" ${promo.enabled? 'checked': ''}> Enabled</label><br><label>Text <input name="text" value="${(promo.text||'').replace(/"/g,'&quot;')}"></label><br><label>Starts At <input name="startsAt" type="datetime-local" value="${promo.startsAt || ''}"></label><br><label>Ends At <input name="endsAt" type="datetime-local" value="${promo.endsAt || ''}"></label><br><button type="submit">Save Promo</button></form></section><section><h2>Product images</h2><form method="post" action="/admin/stores/${id}/upload" enctype="multipart/form-data"><input type="hidden" name="_csrf" value="${token}"><label>Product ID <input name="productId"></label><br><label>Image URL <input name="imageUrl" placeholder="/images/your-image.svg or https://..." ></label><br><label>Or upload file <input type="file" name="imageFile"></label><br><button type="submit">Set Image URL</button></form></section>${imagesHtml ? '<section><h3>Existing images</h3><ul>' + imagesHtml + '</ul></section>' : ''}<p><a href="/admin">Back</a></p></main></body></html>`;
  res.send(html);
});

// Admin: edit store branding (color, logo path)
app.get('/admin/stores/:id/branding', csrfProtection, (req, res) => {
  const id = req.params.id;  
  
  const store = stores.find(s => s.id === id || s.slug === id);
  if (!store) return res.status(404).send('not found');
  const brand = db.getBrand(id) || { brandColor: store.brandColor || '', logo: store.logo || '', textColor: store.textColor || '' };
  const token = (req.csrfToken && req.csrfToken()) || '';
  const ok = req.query.ok ? true : false;
  const error = req.query.error || '';
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Branding - ${store.name}</title><link rel="stylesheet" href="/styles.css"></head><body><main class="admin container"><h1>Branding - ${store.name}</h1>${ok?'<div style="background:#ecfdf5;color:#065f46;padding:8px;border-radius:8px;margin-bottom:8px">Saved</div>':''}${error?'<div style="background:#fff1f2;color:#981b1b;padding:8px;border-radius:8px;margin-bottom:8px>'+error+'</div>':''}<form method="post" action="/admin/stores/${id}/branding" enctype="multipart/form-data"><input type="hidden" name="_csrf" value="${token}"><label>Brand color <input id="brandColor" name="brandColor" value="${(brand.brandColor||'').replace(/"/g,'&quot;')}"></label><br><label>Text color <input id="textColor" name="textColor" value="${(brand.textColor||'').replace(/"/g,'&quot;')}"></label> <button id="applySuggestion" type="button" style="margin-left:8px">Apply suggestion</button><br><label>Logo path <input id="logoPath" name="logo" value="${(brand.logo||'').replace(/"/g,'&quot;')}"></label><br><label>Or upload logo file <input type="file" name="logoFile" id="logoFile"></label><div style="margin-top:8px"><button type="submit">Save</button></div></form><p><a href="/admin/stores/${id}">Back</a></p><hr><h3>Preview</h3><div id="preview" style="padding:18px;border-radius:12px;background:${brand.brandColor||'#f3f4f6'};color:${brand.textColor||'#fff'};display:flex;gap:12px;align-items:center"><img id="previewLogo" src="${brand.logo||''}" style="height:48px;width:48px;object-fit:contain;border-radius:8px;background:#fff"><div><strong>${store.name}</strong><div style="opacity:0.9">${store.description}</div><div style="margin-top:8px;display:flex;gap:8px;align-items:center"><div id="sw_brand" style="width:40px;height:24px;border-radius:6px;background:${brand.brandColor||'#f3f4f6'};box-shadow:inset 0 -2px 0 rgba(0,0,0,0.15)" title="brand"></div><div id="sw_strong" style="width:40px;height:24px;border-radius:6px;background:${hexDarken(brand.brandColor||'#888',0.18)};box-shadow:inset 0 -2px 0 rgba(0,0,0,0.15)" title="brand-strong"></div><div id="sw_light" style="width:40px;height:24px;border-radius:6px;background:${hexLighten(brand.brandColor||'#888',0.18)};box-shadow:inset 0 -2px 0 rgba(0,0,0,0.15)" title="brand-light"></div></div></div></div>
<div id="contrastResults" style="margin-top:12px;padding:8px;border-radius:8px;background:#fff;border:1px solid #e5e7eb;color:#111;max-width:480px">
  <strong>Contrast checks</strong>
  <div id="contrastList" style="margin-top:8px;display:flex;flex-direction:column;gap:6px;font-size:13px"></div>
</div>
<script src="/branding-contrast.js"></script></main></body></html>`;
  res.send(html);
});

// Use multer upload single + rate limiter + csrfProtection similar to other admin upload handlers
// branding POST handler moved below after multer/upload is initialized

// multer storage config: save to public/images with a safe generated filename
const imagesDir = path.join(process.cwd(), 'public', 'images');
if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });

// Allowed mime types and extensions for uploads (simple allow-list)
const ALLOWED_MIME = new Set(['image/svg+xml', 'image/png', 'image/jpeg', 'image/gif']);
const ALLOWED_EXT = new Set(['.svg', '.png', '.jpg', '.jpeg', '.gif']);

// Simple in-memory rate limiter for admin uploads (per-IP)
// - WINDOW_MS: sliding window in ms
// - MAX_UPLOADS: maximum number of uploads allowed per window
// This is intentionally small, lightweight, and suitable for demo/local use only.
const UPLOAD_RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const UPLOAD_RATE_LIMIT_MAX = Number(process.env.UPLOAD_RATE_LIMIT_MAX) || 6; // default 6 uploads per minute
const _uploadRateMap = new Map(); // key -> array of timestamps (ms)

function cleanupOld(timestamps, now){
  while(timestamps.length && (now - timestamps[0]) > UPLOAD_RATE_LIMIT_WINDOW_MS){ timestamps.shift(); }
}

function uploadRateLimiter(req, res, next){
  try{
    const key = (req.ip || req.connection && req.connection.remoteAddress) || 'unknown';
    const now = Date.now();
    let arr = _uploadRateMap.get(key);
    if (!arr) { arr = []; _uploadRateMap.set(key, arr); }
    cleanupOld(arr, now);
    if (arr.length >= UPLOAD_RATE_LIMIT_MAX){
      res.setHeader('Retry-After', Math.ceil(UPLOAD_RATE_LIMIT_WINDOW_MS / 1000));
      return res.status(429).send({ error: 'rate limit exceeded, try again later' });
    }
    // record this attempt
    arr.push(now);
    // keep map size bounded (avoid memory growth) — remove entries with empty arrays
    if (arr.length === 0) _uploadRateMap.delete(key);
    return next();
  }catch(e){ return next(); }
}

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
const uploadMiddleware = [upload.single('imageFile'), uploadRateLimiter, csrfProtection];
app.post('/admin/stores/:id/upload', ...uploadMiddleware, async (req, res) => {
  const id = req.params.id;
  const productId = req.body.productId;
  // if a file was provided, use its path; otherwise fallback to imageUrl
  const file = req.file;
  let imageUrl = (req.body.imageUrl || '').trim();
  if (file){ imageUrl = '/images/' + path.basename(file.path); }
  // Optional upload debug logging was here; removed to reduce console/file noise.
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

// Branding POST handler (after multer/upload initialization)
app.post('/admin/stores/:id/branding', upload.single('logoFile'), uploadRateLimiter, csrfProtection, async (req, res) => {
  const id = req.params.id;
  let brandColor = (req.body && req.body.brandColor) || '';
  let logo = (req.body && req.body.logo) || '';
  let textColor = (req.body && req.body.textColor) || '';

  brandColor = (brandColor || '').trim();
  logo = (logo || '').trim();

  // validate color (allow #RGB or #RRGGBB)
  if (brandColor && !/^#(?:[0-9a-fA-F]{3}){1,2}$/.test(brandColor)){
    return res.redirect('/admin/stores/' + id + '/branding?error=' + encodeURIComponent('Invalid color hex, use #RRGGBB or #RGB'));
  }

  // If a file was uploaded, use it as the logo
  if (req.file){
    try{
      const fp = req.file.path;
      // optional: process with sharp to ensure sane size
      await sharp(fp).resize({ width: 800, withoutEnlargement: true }).toFile(fp + '.tmp');
      fs.renameSync(fp + '.tmp', fp);
      logo = '/images/' + path.basename(fp);
    }catch(err){
      // cleanup and continue (do not fail the whole request)
      try{ if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path); }catch(e){}
      return res.redirect('/admin/stores/' + id + '/branding?error=' + encodeURIComponent('Invalid logo upload'));
    }
  }

  db.setBrand(id, { brandColor: brandColor || '', logo: logo || '', textColor: textColor || '' });
  db.auditLog({ action: 'set_brand', store: id, user: (req.session && req.session.user) || 'unknown', brand: { brandColor, logo, textColor } });
  return res.redirect('/admin/stores/' + id + '/branding?ok=1');
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
  // (no debug logs)
  const store = stores.find(s => s.id === id || s.slug === id);
  if (!store) {
    const available = stores.map(s => `<li><a href="/stores/${s.id}">${s.name} — /stores/${s.id}</a></li>`).join('');
    const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Store not found</title><link rel="stylesheet" href="/styles.css"></head><body><main style="padding:18px"><h1>Store not found</h1><p>No store found for "${id}".</p><p>Available stores:</p><ul>${available}</ul><p><a href="/">Back home</a></p></main></body></html>`;
    return res.status(404).send(html);
  }

  // per-store branding
  // allow persisted branding overrides (brandColor, logo) via db
  const persistedBrand = db.getBrand(id) || {};
  const brandColor = persistedBrand.brandColor || store.brandColor || '#222';
  // allow per-store explicit logo path (e.g. '/images/thuso.png') or fall back to slug-based svg
  const logoUrl = (persistedBrand.logo && persistedBrand.logo.length) ? persistedBrand.logo : (store.logo || `/images/${store.slug || id}.svg`);
  const promo = db.getPromo(id) || { enabled: false, text: '' };

    const storeProducts = products[id] || [];
    const productCardsHtml = renderProductCards(storeProducts);

  // build a safe HTML string without nested template literal complexity
  const html = `<!doctype html>
  <html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${store.name || ''}</title>
    <meta name="description" content="${(store.description||'').replace(/\"/g,'&quot;')}" />
    <meta property="og:title" content="${store.name || ''}" />
    <meta property="og:description" content="${(store.description||'').replace(/\"/g,'&quot;')}" />
    <meta property="og:image" content="${logoUrl}" />
    <meta name="twitter:card" content="summary_large_image" />
  <style>:root{--brand:${brandColor};--brand-strong:${hexDarken(brandColor, 0.18)};--brand-light:${hexLighten(brandColor, 0.18)}}</style>
    <link rel="stylesheet" href="/styles.css">
  </head>
  <body style="background: #f7faf9">
    <header class="store-header">
      <div class="hero">
        <div class="hero-inner">
          <img class="logo" src="${logoUrl}" alt="${store.name || ''} logo" onerror="this.style.visibility='hidden';this.style.pointerEvents='none'">
          <div>
            <h1>${store.name || ''}</h1>
            <p class="tag">${store.description || ''}</p>
            <div class="hero-actions"><a class="brand-btn btn-primary" href="#products" onclick="document.getElementById('q').focus();return false">Shop now</a></div>
            <div class="trust-line">Free pickup • Secure checkout • Bulk discounts</div>
          </div>
        </div>
      </div>
      ${promo.enabled ? `<div class="promo-ribbon">${promo.text}</div>` : ''}
    </header>
    <div class="search"><input id="q" placeholder="Search products"/></div>
    <!-- Shop selector: lets customers switch between available stores -->
    <nav class="shop-selector" aria-label="Choose shop">
      <ul class="shop-list">
        ${stores.slice().sort((a,b) => (a.name || '').localeCompare(b.name || '')).map(s => `
          <li class="shop-item" data-store="${s.id}">
            <a href="/stores/${s.id}" title="${s.name}">
              <img src="${s.logo || `/images/${s.slug || s.id}.svg`}" alt="${s.name} logo" class="shop-logo" onerror="this.style.visibility='hidden'">
              <span class="shop-name">${s.name}</span>
            </a>
            <span class="preferred-badge" aria-hidden="true" style="display:none">Saved</span>
            <button class="save-pref-btn btn" data-store="${s.id}" title="Save as preferred" style="margin-left:8px;padding:6px 8px;font-size:13px">Save</button>
          </li>
        `).join('')}
      </ul>
      <div class="pref-controls" style="display:flex;align-items:center;gap:8px;padding-left:12px">
        <button id="clear-preference" class="btn btn-ghost" style="padding:6px 10px;font-size:13px">Clear preference</button>
      </div>
    </nav>
    <main>
      <section id="products" class="grid">${productCardsHtml}</section>
    </main>
    <script id="initial-products" type="application/json">${JSON.stringify(products[id] || [])}</script>

  <!-- Toast container -->
  <div id="toast" style="position:fixed;right:16px;bottom:80px;z-index:99999;display:none"></div>

    <footer class="site-footer"><div class="inner"><div>Contact: <a href="mailto:info@thuso.example">info@thuso.example</a></div><div><a href="/">Back to MyStore</a> • <a href="/stores/${id}/cart">Your cart</a></div></div></footer>
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
  <div style="margin-top:12px;text-align:right"><strong>Total: BWP <span id="cart-total">0.00</span></strong></div>
        <div style="margin-top:12px;text-align:right"><button id="save-server">Save</button> <button id="do-checkout">Checkout</button></div>
      </div>
    </div>

    <script>
      // Small boot: inject the current store id and load the external client script
      window.__storeId = ${JSON.stringify(id)};
    </script>
    <script src="/store.js"></script>
  </body>
  </html>`;

  res.send(html);
  // (no debug logs)
});

// Append footer to the rendered HTML by injecting before closing body in the store route
// (we keep footer simple and informational)
// Note: this appends a small footer via string concat in the store HTML above when sending the response.

// Cart page — shows client cart and can save to server
app.get('/stores/:id/cart', (req, res) => {
  const id = req.params.id;
  const store = stores.find(s => s.id === id || s.slug === id);
  if (!store) {
    const available = stores.map(s => `<li><a href="/stores/${s.id}">${s.name} — /stores/${s.id}</a></li>`).join('');
    const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Store not found</title><link rel="stylesheet" href="/styles.css"></head><body><main style="padding:18px"><h1>Store not found</h1><p>No store found for "${id}".</p><p>Available stores:</p><ul>${available}</ul><p><a href="/">Back home</a></p></main></body></html>`;
    return res.status(404).send(html);
  }

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
    <!-- Toast container for cart page -->
    <div id="cart-toast" style="position:fixed;right:16px;bottom:80px;z-index:99999;display:none"></div>
    <script>
      window.__storeId = ${JSON.stringify(id)};
    </script>
    <script src="/cart.js"></script>
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
        ${order.items.map(i => `<li>${i.name} — ${i.qty} × BWP ${(i.price||0).toFixed(2)} = BWP ${(i.lineTotal||0).toFixed(2)}</li>`).join('')}
      </ul>
      <h3>Total: BWP ${(order.total||0).toFixed(2)}</h3>
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
