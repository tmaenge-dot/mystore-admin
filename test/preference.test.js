import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../app.js';
import fs from 'fs';
import path from 'path';

test('POST /api/preferred-store increments counts', async () => {
  const countsPath = path.resolve('./data_store/preferred_counts.json');
  // ensure starting state
  let before = {};
  if (fs.existsSync(countsPath)){
    try{ before = JSON.parse(fs.readFileSync(countsPath, 'utf8') || '{}'); }catch(e){ before = {}; }
  }
  const storeId = 'sefalana';

  const res = await request(app).post('/api/preferred-store').send({ id: storeId });
  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);

  let after = {};
  if (fs.existsSync(countsPath)){
    try{ after = JSON.parse(fs.readFileSync(countsPath, 'utf8') || '{}'); }catch(e){ after = {}; }
  }

  const beforeCount = (before[storeId] && before[storeId].count) || 0;
  const afterCount = (after[storeId] && after[storeId].count) || 0;
  assert.ok(afterCount === beforeCount + 1, `expected ${beforeCount + 1} got ${afterCount}`);

  // cleanup: restore previous counts state
  try{ fs.writeFileSync(countsPath, JSON.stringify(before, null, 2)); }catch(e){}
});
