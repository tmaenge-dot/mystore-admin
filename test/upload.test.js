import test from 'node:test';
import assert from 'node:assert/strict';
import db from '../lib/db.js';

test('db.setImageMap and setImageMap removal', async () => {
  const store = 'choppies';
  // ensure starting clean
  db.setImageMap(store, {});
  const before = db.getImageMap(store);
  assert.deepEqual(before, {});

  db.setImageMap(store, { p1: '/images/apple.svg' });
  const m = db.getImageMap(store);
  assert.ok(m && m.p1 === '/images/apple.svg');

  // delete mapping
  delete m.p1;
  db.setImageMap(store, m);
  const after = db.getImageMap(store);
  assert.ok(!(after && after.p1));
});

