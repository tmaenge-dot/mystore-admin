Thuso Wholesaler — Demo instructions

This small README explains how Thuso staff can demo the app on desktop and mobile.

Local run (developer machine)

1. Install dependencies:

```bash
npm install
```

2. Start in dev mode (nodemon watches for changes):

```bash
npm run dev
```

3. Open the store page in a browser (desktop or mobile):

- http://localhost:5000/stores/thuso

Admin login (use environment variables or defaults):

- Default admin username: admin
- Default admin password: admin
- To change, set ADMIN_USER and ADMIN_PASS before starting the server.

What to test

- Store hero: verify Thuso logo and green brand header are shown.
- Products: the three sample bulk items (Rice, Oil, Sugar) should show placeholder images and bulk pricing tiers both in the product card and inside the product modal.
- Cart & Checkout: add multiple quantities to validate bulk pricing presentation (pricing is informational in this demo; checkout creates an order).
- Admin audit: login at /admin/login, then open /admin/audit to see admin actions.

Notes

- The app is a demo/proof-of-concept: sessions are persisted in `./data_store/sessions.sqlite`. Audit logs are appended to `./data_store/audit.log`.
- Replace placeholder images in `public/images/` with real product photos for a stronger demo.
