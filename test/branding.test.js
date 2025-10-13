import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import fs from 'fs';
import path from 'path';

import app from '../app.js';
import db from '../lib/db.js';

test('branding POST happy path: upload logo and color', async () => {
  const agent = request.agent(app);
  const store = 'branding_e2e_store';
  // ensure no existing brand
  try{ fs.unlinkSync(path.join(process.cwd(), 'data_store', 'brand_' + store + '.json')); }catch(e){}

  const sample = path.join(process.cwd(), 'test', 'sample-image.svg');
  assert.ok(fs.existsSync(sample), 'sample image should exist in test/');

  // login + csrf
  const loginPage = await agent.get('/admin/login');
  assert.equal(loginPage.status, 200);
  const m = loginPage.text.match(/name="_csrf" value="([^"]+)"/);
  const csrfLogin = m && m[1];
  const user = process.env.ADMIN_USER || 'admin';
  const pass = process.env.ADMIN_PASS || 'admin';
  const loginRes = await agent.post('/admin/login').type('form').send({ _csrf: csrfLogin, user, pass });
  assert.ok([302,303].includes(loginRes.status), 'login should redirect');

  const adminLoginPage = await agent.get('/admin/login');
  const m2 = adminLoginPage.text.match(/name="_csrf" value="([^"]+)"/);
  const csrf = m2 && m2[1];

  const color = '#1a2b3c';

  const res = await agent.post('/admin/stores/' + store + '/branding')
    .attach('logoFile', sample)
    .field('_csrf', csrf)
    .field('brandColor', color);
  // handler redirects back on success
  assert.ok([302,303].includes(res.status), 'branding POST should redirect on success');

  // persisted file should exist
  const brandFile = path.join(process.cwd(), 'data_store', 'brand_' + store + '.json');
  assert.ok(fs.existsSync(brandFile), 'brand file should be persisted');
  const data = JSON.parse(fs.readFileSync(brandFile, 'utf8'));
  assert.equal(data.brandColor, color);
  assert.ok(data.logo && data.logo.startsWith('/images/'));

  // cleanup created image and brand file
  try{ if (data.logo){ const img = path.join(process.cwd(), 'public', 'images', path.basename(data.logo)); if (fs.existsSync(img)) fs.unlinkSync(img); } }catch(e){}
  try{ fs.unlinkSync(brandFile); }catch(e){}
});

test('branding POST rejects invalid color', async () => {
  const agent = request.agent(app);
  const store = 'branding_bad_color';

  const loginPage = await agent.get('/admin/login');
  assert.equal(loginPage.status, 200);
  const m = loginPage.text.match(/name="_csrf" value="([^"]+)"/);
  const csrfLogin = m && m[1];
  const user = process.env.ADMIN_USER || 'admin';
  const pass = process.env.ADMIN_PASS || 'admin';
  const loginRes = await agent.post('/admin/login').type('form').send({ _csrf: csrfLogin, user, pass });
  assert.ok([302,303].includes(loginRes.status), 'login should redirect');
  const adminLoginPage = await agent.get('/admin/login');
  const m2 = adminLoginPage.text.match(/name="_csrf" value="([^"]+)"/);
  const csrf = m2 && m2[1];

  const res = await agent.post('/admin/stores/' + store + '/branding')
    .type('form')
    .send({ _csrf: csrf, brandColor: 'not-a-color' });

  // app redirects back with error in query string for invalid color
  assert.ok([302,303].includes(res.status), 'invalid color should redirect back');
  // ensure brand file not created
  const brandFile = path.join(process.cwd(), 'data_store', 'brand_' + store + '.json');
  assert.ok(!fs.existsSync(brandFile), 'brand file should not be created for invalid color');
});

test('branding POST rejects invalid uploaded file', async () => {
  const agent = request.agent(app);
  const store = 'branding_invalid_file';
  const sample = path.join(process.cwd(), 'test', 'evil.txt');
  assert.ok(fs.existsSync(sample), 'evil.txt should exist in test/');

  const loginPage = await agent.get('/admin/login');
  assert.equal(loginPage.status, 200);
  const m = loginPage.text.match(/name="_csrf" value="([^"]+)"/);
  const csrfLogin = m && m[1];
  const user = process.env.ADMIN_USER || 'admin';
  const pass = process.env.ADMIN_PASS || 'admin';
  const loginRes = await agent.post('/admin/login').type('form').send({ _csrf: csrfLogin, user, pass });
  assert.ok([302,303].includes(loginRes.status), 'login should redirect');
  const adminLoginPage = await agent.get('/admin/login');
  const m2 = adminLoginPage.text.match(/name="_csrf" value="([^"]+)"/);
  const csrf = m2 && m2[1];

  const res = await agent.post('/admin/stores/' + store + '/branding')
    .attach('logoFile', sample)
    .field('_csrf', csrf)
    .field('brandColor', '#abcdef');

  // our handler returns 400 for invalid file types when sharp/process fails
  assert.equal(res.status, 400);
});
