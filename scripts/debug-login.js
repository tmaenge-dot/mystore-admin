import request from 'supertest';
import { app } from '../index.js';

(async ()=>{
  const agent = request.agent(app);
  const loginPage = await agent.get('/admin/login');
  console.log('GET /admin/login status', loginPage.status);
  const m = loginPage.text.match(/name="_csrf" value="([^"]+)"/);
  console.log('csrf token present?', !!m);
  const csrf = m && m[1];
  const loginRes = await agent.post('/admin/login').type('form').send({ _csrf: csrf, user: 'admin', pass: 'admin' });
  console.log('POST /admin/login status', loginRes.status);
  console.log('headers:', loginRes.headers);
  console.log('body length', loginRes.text && loginRes.text.length);
  process.exit(0);
})();
