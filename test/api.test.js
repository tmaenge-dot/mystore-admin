import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../app.js';
import fs from 'fs';
import path from 'path';

test('GET /api/health returns ok', async () => {
  const res = await request(app).get('/api/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);
});

test('GET /api/stores returns array', async () => {
  const res = await request(app).get('/api/stores');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body));
});

test('GET products for store', async () => {
  const res = await request(app).get('/api/stores/choppies/products');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body));
});

test('POST and GET cart, create order, get order', async () => {
  const cartRes = await request(app).post('/api/stores/choppies/cart').send({ items: [{ id: 'p1', qty: 1 }] });
  assert.equal(cartRes.status, 201);

  const getCart = await request(app).get('/api/stores/choppies/cart');
  assert.equal(getCart.status, 200);
  assert.ok(Array.isArray(getCart.body.items));

  const orderRes = await request(app).post('/api/stores/choppies/orders').send({ items: [{ id: 'p1', qty: 1 }] });
  assert.equal(orderRes.status, 201);
  const orderId = orderRes.body.id;

  const getOrder = await request(app).get('/api/stores/choppies/orders/' + orderId);
  assert.equal(getOrder.status, 200);
  assert.equal(getOrder.body.id, orderId);

  // cleanup data_store files created by tests
  const ds = path.resolve('./data_store');
  try{
    fs.rmSync(path.join(ds, 'cart_choppies.json'));
  }catch(e){}
  try{
    fs.rmSync(path.join(ds, 'orders_choppies.json'));
  }catch(e){}
});

test('invalid cart and invalid order payloads', async () => {
  // invalid cart (no items array)
  const badCart = await request(app).post('/api/stores/choppies/cart').send({ notitems: true });
  assert.equal(badCart.status, 400);

  // invalid order payload
  const badOrder = await request(app).post('/api/stores/choppies/orders').send({});
  assert.equal(badOrder.status, 400);

  // product not found detail
  const p404 = await request(app).get('/api/stores/choppies/products/doesnotexist');
  assert.equal(p404.status, 404);

  // empty items array on cart should still be accepted (empty cart)
  const emptyCart = await request(app).post('/api/stores/choppies/cart').send({ items: [] });
  assert.equal(emptyCart.status, 201);

  // order with non-number qty should coerce to 0 or be treated as 0 (server code uses Number())
  const oddOrder = await request(app).post('/api/stores/choppies/orders').send({ items: [{ id: 'p1', qty: 'bad' }] });
  // server will accept but qty coerced to 0 => total maybe 0, still created
  assert.equal(oddOrder.status, 201);

  // requests for unknown store should 404
  const unknownStore = await request(app).get('/api/stores/doesnotexist/products');
  assert.equal(unknownStore.status, 404);
});
