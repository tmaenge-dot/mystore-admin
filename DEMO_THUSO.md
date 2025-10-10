# Thuso Wholesaler — Demo Script and Pitch

Goal
----
Show Thuso decision makers how the MyStore demo supports wholesale operations: bulk pricing, catalog updates, and simple order creation for small retailers.

Preparation
-----------
1. Start the app locally:

```bash
npm install
npm run dev
```

2. Open the Thuso demo store in a browser:

- http://localhost:5000/stores/thuso

Demo flow (10–12 minutes)
-------------------------
1. Opening pitch (1 min)
   - "This is a lightweight admin + storefront demo that demonstrates how Thuso can present wholesale products with bulk pricing, accept orders, and update product images and details without complex tooling."

2. Show the storefront (2 min)
   - Open `/stores/thuso`.
   - Highlight product cards: name, price, and note the `bulkPricing` tiers for each product.
   - Click a product (e.g. "Bulk Rice 10kg") to show its description and bulk pricing.

3. Demonstrate placing an order (2 min)
   - Add multiple quantities to the cart showing how totals update.
   - Use the client-side cart and show the server-side saved cart endpoint (`/api/stores/thuso/cart`) by saving a cart (the app supports server-side cart persistence).

4. Admin upload & catalog update (3–4 min)
   - Go to the admin login: `/admin/login` (use admin/admin).
   - Open `/admin/stores/thuso` to manage Thuso's products.
   - Use the upload form to set an image for "Bulk Rice 10kg" (or switch to an image URL). Show how the image appears on the storefront after saving.
   - Mention security measures: MIME allow-list, 5MB limit, safe filenames, optional server-side processing via `sharp`.

5. Maintenance & orphan cleanup (1 min)
   - Mention the included `scripts/cleanup-orphaned-images.js` for detecting unused images and the workflow that can run it periodically.

6. Next steps & closing (1 min)
   - Offer to prototype an integration with Thuso's inventory system or add presigned uploads to S3 for production-grade handling.

Talking points to emphasize
--------------------------
- Bulk pricing support: demonstrates how wholesale customers or resellers can see tiered pricing.
- Quick content updates: non-technical staff can change images/descriptions via the admin UI.
- Lightweight, extendable: the codebase is intentionally small and can be adapted to Thuso's systems.

Troubleshooting notes
---------------------
- Admin login is `admin`/`admin` in this demo — change in `app.js` for real deployments.
- If uploads fail, ensure `public/images` is writable and `npm install` completed.
- For production, do not enable `DEBUG_LOGS` and ensure `SESSION_SECRET` is set.

Contact
-------
If you'd like, I can create a short recorded walkthrough video or generate higher-resolution exportable screenshots of the admin upload flow. Request pages and viewport sizes and I'll add them.
