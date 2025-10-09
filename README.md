# MyStore Admin (multi-store demo)

This repository is a minimal Express.js backend that now supports multiple demo stores.

Quick start

```bash
npm install
npm run dev
```

Uploads
-------

This project supports a simple admin file-upload flow (optional) that stores uploaded images under `public/images` and maps them to product IDs via the admin UI.

How it works
- The admin page at `/admin/stores/:id` has a form where you can either set an image by URL or upload a file.
- Uploaded files are saved to `public/images` and the stored URL (e.g. `/images/1600000000000-photo.svg`) is persisted in the repo's file DB via `lib/db.js`.

Enabling uploads
- Multer is used for multipart handling and was added to `package.json`. Install dependencies and run the server as usual:

```bash
npm install
npm run dev
```

Security notes and recommendations
- The project currently uses a basic multer configuration with a 5MB file size limit and minimal filename sanitization. This is intended for demo and local usage only.
- Multer 1.x has a known CVE (see the npm install warning). For production, consider one of the following:
	- Use `1.4.4-lts.1` (if available) or a maintained fork with the CVE fixed.
	- Proxy uploads to an object store (S3/MinIO) using presigned URLs so the app never directly accepts large binary uploads.
	- Validate uploaded files: check MIME type, verify file signatures where possible, and restrict allowed extensions to `.png`, `.jpg`, `.jpeg`, `.svg`.
	- Run image processing (resize/strip metadata) in a safe worker or use a library like `sharp` with careful input validation.

Image processing (server-side)
------------------------------

This project can optionally perform server-side image processing using the `sharp` library. When enabled (installed), uploaded images are validated and resized to a safe maximum width before being persisted to `public/images`. This helps protect downstream consumers from oversized images and removes potentially harmful metadata.

Notes:
- `sharp` is an optional dependency. If present in `package.json` and installed, the upload handler will use it to validate and resize uploaded images.
- Typical resize behavior: images are resized to a maximum width (keeping aspect ratio) and the processed image overwrites the original saved upload.

Debug logs (DEBUG_LOGS)
-----------------------

Two optional debug log files can be written to `data_store/` during development: `db_debug.log` and `upload_debug.log`. These are noisy and were used while developing the upload flow. To enable debug logging set the environment variable `DEBUG_LOGS=1` when starting the server. Example:

```
DEBUG_LOGS=1 npm run dev
```

When debug logging is disabled (the default), the server will not append to these files.

Admin credentials for local dev
-----------------------------

The demo app provides a simple admin login used by tests and for the local admin UI. For convenience in local development the default credentials are:

- Username: `admin`
- Password: `admin`

These credentials are intentionally simple for the demo. Do not use them in production. To change the credentials, edit the values passed to the login check in `app.js`.

Upload security recommendations (quick checklist)
-----------------------------------------------

- Run uploads through a validated worker (e.g. a queue / background processor) rather than doing large processing on the request thread for production workloads.
- Prefer presigned uploads to an object store so the web server does not accept or process large binaries directly.
- Keep an allow-list of MIME types and extensions; verify file signatures where possible.
- Sanitize or generate safe filenames (this project uses a crypto-backed id when available).
- Limit file sizes (5MB by default here) and reject anything larger.
- Strip metadata from images (EXIF) during processing to avoid leaking sensitive info.

Cleanup and maintenance
- Uploaded files are saved to `public/images`. Periodically review and remove orphaned files if needed. You can find orphaned images by comparing files in `public/images` with entries in the image map JSON persisted in `data_store/`.
If you want, I can add a small maintenance script to detect and optionally delete orphaned uploads.

There is a small helper script included to detect and optionally delete orphaned images:

```
# list orphaned files (dry-run)
npm run cleanup-orphans

# actually delete orphaned files
npm run cleanup-orphans -- --delete
```

The script compares `public/images` with all `data_store/images_*.json` maps and reports files that are not referenced.

Open a store in your browser (example):

- http://localhost:5000/stores/choppies
- http://localhost:5000/stores/woolworths

CI

[![CI (YOUR_OWNER/YOUR_REPO)](https://github.com/YOUR_OWNER/YOUR_REPO/actions/workflows/nodejs.yml/badge.svg)](https://github.com/YOUR_OWNER/YOUR_REPO/actions/workflows/nodejs.yml)

You can also trigger the CI workflow manually (useful to override smoke test timeout):

1. Go to the Actions tab in GitHub and select the `CI` workflow.
2. Click "Run workflow" and set `smoke_timeout` (seconds) as needed.

APIs

- GET /api/health — returns {ok:true, uptime}
- GET /api/stores — list of stores
- GET /api/stores/:id — store metadata
- GET /api/stores/:id/products — products for the store
 - GET /api/stores/:id/products — products for the store
 - GET /api/stores/:id/products/:productId — product detail
 - GET /api/stores/:id/cart — get persisted cart (file DB)
 - POST /api/stores/:id/cart — save cart server-side
 - POST /api/stores/:id/orders — create an order (server computes totals)
 - GET /api/stores/:id/orders — list orders
 - GET /api/stores/:id/orders/:orderId — get order detail

Notes

- This uses ES modules (`type: "module"` in package.json).
- Seed data lives in `data/stores.js` and `data/products.js`.
- The frontend store pages are simple, responsive HTML pages served from the server and fetch product lists from the API.

Tests & CI

- Run tests locally:

```bash
npm install
npm test
```

- A GitHub Actions workflow is included at `.github/workflows/nodejs.yml` which runs the test suite on pushes and PRs.

Docker

Build and run with Docker:

```bash
docker build -t mystore-admin .
docker run -p 5000:5000 -v "$PWD/data_store":/usr/src/app/data_store mystore-admin
```

Or use docker-compose (data_store is mounted as a host directory):

```bash
docker-compose up --build
```

Troubleshooting

- If the server does not start, check container logs with `docker logs <container id>`.
- Ensure the `data_store` directory exists and is writable by Docker on your host; the compose file mounts `./data_store` to persist carts and orders.

Docker Compose notes

- The repository's `docker-compose.yml` maps host port 5001 to the container's 5000 to avoid conflicts with a local dev server. Access the app at http://localhost:5001 when using compose.

Smoke test

After running compose, you can run a small smoke test that polls the health endpoint and waits up to 30s for a response:

```bash
./scripts/compose-smoke.sh
# or override host/port:
./scripts/compose-smoke.sh localhost 5001
```
