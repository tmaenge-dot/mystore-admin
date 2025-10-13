import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../app.js';

test('SSR /stores/:id includes product cards and BWP prices', async () => {
  const res = await request(app).get('/stores/thuso');
  assert.equal(res.status, 200);
  const text = res.text || '';
  assert.ok(text.includes('class="card"'), 'expected server-rendered product card');
  assert.ok(text.includes('BWP'), 'expected BWP currency in SSR output');
});
