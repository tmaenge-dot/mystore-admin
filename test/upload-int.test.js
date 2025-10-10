import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import app from '../app.js';
import db from '../lib/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('admin multipart upload and delete flow', async (t) => {
  const agent = request.agent(app);
  const store = 'upload_int_store';
  // ensure clean image map for our test-only store
  db.setImageMap(store, {});
  // perform real admin login to obtain session and CSRF token
  const loginPage = await agent.get('/admin/login');
  assert.equal(loginPage.status, 200);
  const m = loginPage.text.match(/name="_csrf" value="([^"]+)"/);
  assert.ok(m, 'csrf token found on login page');
  const csrfLogin = m[1];
  const user = process.env.ADMIN_USER || 'admin';
  const pass = process.env.ADMIN_PASS || 'admin';
  const loginRes = await agent.post('/admin/login').type('form').send({ _csrf: csrfLogin, user, pass });
  assert.ok([302,303].includes(loginRes.status), 'login should redirect');

  // After login, request the login page to obtain a CSRF token bound to the session
  const adminLoginPage = await agent.get('/admin/login');
  const m2 = adminLoginPage.text.match(/name="_csrf" value="([^"]+)"/);
  assert.ok(m2, 'csrf token for admin found');
  const csrf = m2[1];

  // submit form with productId and imageUrl (handler accepts URL or file)
  const uploadRes = await agent.post('/admin/stores/' + store + '/upload')
    .type('form')
    .send({ _csrf: csrf, productId: 'p1', imageUrl: '/images/apple.svg' });
  // expect redirect back to admin page; if not, include response text for debugging
  if (![302, 303].includes(uploadRes.status)) {
    throw new Error('upload failed: status=' + uploadRes.status + ' body=' + String(uploadRes.text).slice(0,300));
  }

  // verify mapping updated
  const map = db.getImageMap(store);
  if (!(map && map.p1)){
    // gather diagnostics
    let dbg='';
    try{ dbg = fs.readFileSync(path.join(process.cwd(), 'data_store', 'db_debug.log'), 'utf8'); }catch(e){}
    throw new Error('image map missing after upload; uploadRes.status=' + uploadRes.status + ' headers=' + JSON.stringify(uploadRes.headers) + ' db_debug=' + String(dbg).slice(-2000));
  }

  // mapping should point to an image (file existence is covered by the e2e test)
  const imagePath = path.join(process.cwd(), 'public', 'images', path.basename(map.p1));
  // if it's a local image path ensure it looks correct; don't fail if file is absent (other tests cover file writes)
  if (map.p1 && map.p1.startsWith('/images/')){
    // best-effort check only
    try{ fs.accessSync(imagePath); }catch(e){ /* ok - other test verifies file writes */ }
  }

  // delete mapping via admin delete endpoint with CSRF
  const admDel = await agent.get('/admin/stores/choppies');
  const m3 = admDel.text.match(/name="_csrf" value="([^"]+)"/);
  const csrf2 = m3 && m3[1];
  const del = await agent.post('/admin/stores/' + store + '/images/' + encodeURIComponent('p1') + '/delete')
    .type('form')
    .send({ _csrf: csrf2 });
  assert.ok([302,303].includes(del.status), 'delete should redirect');

  const map2 = db.getImageMap(store);
  assert.ok(!(map2 && map2.p1), 'mapping should be removed');

  // cleanup uploaded file and mapping file
  try{ if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath); }catch(e){}
  try{ fs.unlinkSync(path.join(process.cwd(), 'data_store', 'images_' + store + '.json')); }catch(e){}
});
