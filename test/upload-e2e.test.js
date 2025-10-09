import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import fs from 'fs';
import path from 'path';

import app from '../app.js';
import db from '../lib/db.js';

test('e2e multipart upload creates file and mapping then delete cleans up', async () => {
  const agent = request.agent(app);
  const store = 'upload_e2e_store';
  db.setImageMap(store, {});

  const sample = path.join(process.cwd(), 'test', 'sample-image.svg');
  assert.ok(fs.existsSync(sample), 'sample image should exist in test/');

  // perform real login and obtain CSRF
  const loginPage = await agent.get('/admin/login');
  assert.equal(loginPage.status, 200);
  const m = loginPage.text.match(/name="_csrf" value="([^"]+)"/);
  const csrfLogin = m && m[1];
  const user = process.env.ADMIN_USER || 'admin';
  const pass = process.env.ADMIN_PASS || 'admin';
  const loginRes = await agent.post('/admin/login').type('form').send({ _csrf: csrfLogin, user, pass });
  assert.ok([302,303].includes(loginRes.status), 'login should redirect');

  // After login, request the login page (csurf-protected) again to get a fresh CSRF token tied to session
  const adminLoginPage = await agent.get('/admin/login');
  const csrf = csrfLogin;

  // perform multipart upload with proper CSRF token
  const res = await agent.post('/admin/stores/' + store + '/upload')
    .attach('imageFile', sample)
    .field('_csrf', csrf)
    .field('productId', 'p1');
  if (![302,303].includes(res.status)) throw new Error('upload failed: ' + String(res.text).slice(0,300));

  const map = db.getImageMap(store);
  assert.ok(map && map.p1, 'image map should contain p1 after upload');

  // file should exist in public/images
  const uploaded = path.join(process.cwd(), 'public', 'images', path.basename(map.p1));
  assert.ok(fs.existsSync(uploaded), 'uploaded file should exist');

  // delete mapping via admin delete endpoint with CSRF
  const adm2 = await agent.get('/admin/stores/choppies');
  const m3 = adm2.text.match(/name="_csrf" value="([^"]+)"/);
  const csrf2 = m3 && m3[1];
  const del = await agent.post('/admin/stores/' + store + '/images/' + encodeURIComponent('p1') + '/delete')
    .type('form')
    .send({ _csrf: csrf2 });
  assert.ok([302,303].includes(del.status), 'delete should redirect');

  const map2 = db.getImageMap(store);
  assert.ok(!(map2 && map2.p1), 'mapping should be removed');

  // cleanup uploaded file
  try{ if (fs.existsSync(uploaded)) fs.unlinkSync(uploaded); }catch(e){}
  try{ fs.unlinkSync(path.join(process.cwd(), 'data_store', 'images_' + store + '.json')); }catch(e){}
});
