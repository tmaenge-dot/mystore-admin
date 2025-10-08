import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import fs from 'fs';
import path from 'path';

import app from '../app.js';

test('upload invalid file type is rejected', async () => {
  const agent = request.agent(app);
  const store = 'upload_invalid_store';
  const sample = path.join(process.cwd(), 'test', 'evil.txt');
  // login + CSRF
  const loginPage = await agent.get('/admin/login');
  assert.equal(loginPage.status, 200);
  const m = loginPage.text.match(/name="_csrf" value="([^"]+)"/);
  const csrfLogin = m && m[1];
  const user = process.env.ADMIN_USER || 'admin';
  const pass = process.env.ADMIN_PASS || 'admin';
  const loginRes = await agent.post('/admin/login').type('form').send({ _csrf: csrfLogin, user, pass });
  assert.ok([302,303].includes(loginRes.status), 'login should redirect');
  // After login, request /admin/login to get CSRF token tied to the session
  const adminLoginPage = await agent.get('/admin/login');
  const m2 = adminLoginPage.text.match(/name="_csrf" value="([^"]+)"/);
  const csrf = m2 && m2[1];

  // attempt to upload a text file as image
  const res = await agent.post('/admin/stores/' + store + '/upload')
    .attach('imageFile', sample)
    .field('_csrf', csrf)
    .field('productId', 'p1');
  // should return 400 due to unsupported file type
  assert.equal(res.status, 400);
  assert.ok(res.body && res.body.error, 'error message expected');
});
