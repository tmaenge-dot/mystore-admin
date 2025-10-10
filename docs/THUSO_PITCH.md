# Thuso Wholesaler — MyStore Demo

---

## Slide 1 — Title

Thuso Wholesaler

MyStore — Lightweight wholesale storefront and admin

---

## Slide 2 — The problem

- Small retailers need simple ways to order wholesale goods
- Catalog updates and product image updates are slow and technical
- Inventory and bulk pricing are hard to communicate clearly

---

## Slide 3 — Our solution

- A tiny, secure admin + storefront
- Simple image uploads with server-side validation and resizing
- Bulk pricing, cart persistence, and server-side order creation

---

## Slide 4 — Key features

- Admin image upload (safe filenames, MIME allow-list)
- Server-side image processing (optional sharp) + orphan cleanup
- Audit logging and simple file-backed persistence
- Tests and demo scripts to reproduce flows

---

## Slide 5 — Demo flow

1. Admin logs in to /admin
2. Uploads an image for a product
3. Client fetches /api/stores/:id/products and displays updated image
4. Customer creates cart -> server-side save -> checkout -> order confirmation

---

## Slide 6 — Pricing / Pilot

- Quick pilot: 4 weeks integration, $X/month per store
- Optional: S3 presigned uploads, DB integration, auth

---

## Slide 7 — Screenshots

- Storefront (demo)
- Admin upload UI

---

## Slide 8 — Ask & Next Steps

- Pilot the Thuso demo for 4 weeks
- Provide feedback and production requirements
# Thuso Wholesaler — MyStore Demo Pitch

Slide 1
- Title: Thuso Wholesaler — Retail-Friendly Wholesale Ordering
- Subtitle: Fast, lightweight storefront + admin for bulk sales

Slide 2
- Problem
  - Small retailers need simple access to wholesale pricing and order placement
  - Current tooling is fragmented: spreadsheets, phone calls, and manual invoices

Slide 3
- Solution
  - MyStore: a compact admin + storefront that shows bulk pricing, accepts orders, and supports quick product/image updates via an admin UI
  - Lightweight stack — easy to deploy and integrate

Slide 4
- Demo highlights
  - Thuso-branded storefront with bulk pricing tiers for rice, oil, sugar
  - Server-side cart persistence and order creation
  - Admin image upload & server-side validation (safe filenames, MIME allow-list, size limits)

Slide 5
- Technical details
  - Node.js + Express, file-backed persistence (seedable data), optional image processing with sharp
  - Session + CSRF protection, audit logging, and orphan-image cleanup tooling

Slide 6
- Business model & ask
  - Pilot: Setup + 1 month support for integration with Thuso inventory (estimate)
  - Next: Presigned S3 uploads and multi-store multi-vendor support

Slide 7
- Call to action
  - Schedule a live demo and integration scoping session
  - Contact: [your contact details]
