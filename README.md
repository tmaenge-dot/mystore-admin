# MyStore Admin (multi-store demo)

This repository is a minimal Express.js backend that now supports multiple demo stores.

Quick start

```bash
npm install
npm run dev
```

### Troubleshooting: port 5000 already in use

If you see an error like:

```
Error: listen EADDRINUSE: address already in use 0.0.0.0:5000
```

nodemon configuration
---------------------

This repository includes a `nodemon.json` file to prevent nodemon from restarting when runtime artifacts change (for example: files under `data_store/`, `logs/`, or `server.pid`). These files are written by the running server and can otherwise cause nodemon to restart repeatedly which leads to transient failures when the browser requests static assets like `/store.js`.

If you want nodemon to watch additional directories, edit `nodemon.json` and restart nodemon (or run `npm run dev`).

It means another process is already listening on port 5000. Use the included helper to safely free the port and restart the server:

```bash
./scripts/restart-server.sh
```

This script will attempt to stop the process listening on port 5000, remove a stale `server.pid` if present, start the server in the background and print a short HTTP verification.


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

Pitch & demo for Thuso Wholesaler
--------------------------------

If you're presenting this app to Thuso Wholesaler, use the `DEMO_THUSO.md` guide for a short, focused walkthrough tailored to wholesale buyers and store managers. It highlights bulk-pricing, ordering, and the admin upload workflow so you can demonstrate how the platform supports wholesale inventory and catalog updates.

See `DEMO_THUSO.md` for the step-by-step demo script.

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

Tunnel (localtunnel) usage
--------------------------

For quick remote demos you can expose the running local server with `localtunnel`.
This repo includes small helpers and a systemd user unit template under `scripts/`.

Start the tunnel (from the repo root):

```bash
./scripts/tunnel-start.sh mystore-demo-xyz
```

This will:
- start the `localtunnel` CLI installed under `/tmp/lt` (see the script for install steps)
- write the tunnel pid to `/tmp/lt.pid`
- capture CLI logs to `/tmp/lt_run_bg.log`

Stop the tunnel:

```bash
./scripts/tunnel-stop.sh
```

Systemd user unit (optional)
----------------------------
If you want the tunnel to start automatically for your user, copy the provided service
template to your user systemd directory and enable it:

```bash
mkdir -p ~/.config/systemd/user
cp scripts/mystore-tunnel.service ~/.config/systemd/user/mystore-tunnel.service
systemctl --user daemon-reload
systemctl --user enable --now mystore-tunnel.service
```

Notes & security
----------------
- The tunnel exposes your local app to the public internet. Avoid using production data while the tunnel is active.
- The demo admin UI still uses session cookies and CSRF protection, but treat the public URL as sensitive during demos.
- When finished, stop the tunnel with `./scripts/tunnel-stop.sh` or `systemctl --user stop mystore-tunnel.service`.
- If you need a more featureful/protected tunnel (TLS, auth, replay protection), consider using `ngrok` with an account and authtoken instead.

Demo runner
-----------

For a one-command demo startup (start the server if needed, start the tunnel, and print the public URL):

```bash
./scripts/demo-runner.sh mystore-demo-xyz
# Optionally auto-stop after N minutes:
./scripts/demo-runner.sh mystore-demo-xyz --auto-stop 15
```

This helper avoids requiring tokens or external accounts; it relies on the local `localtunnel` install under `/tmp/lt` and the included start/stop scripts.

Env helper
----------

A small helper is included to manage the repo `.env` used by the systemd user services (`mystore-tunnel.service` and `mystore-demo-runner.service`). The script edits or sets variables and restarts the services for you.

Location: `scripts/env-edit.sh`

Usage examples:

```bash
# show current values
./scripts/env-edit.sh --print

# open $EDITOR to edit .env (creates from .env.template if missing)
./scripts/env-edit.sh --edit

# set values non-interactively and restart services
./scripts/env-edit.sh --set SUBDOMAIN=newsub
./scripts/env-edit.sh SUBDOMAIN=newsub LT_DIR=/tmp/lt
```

The `.env.template` in the repo shows the defaults. After changes are applied the tunnel and demo-runner services are restarted automatically.

Troubleshooting
---------------
Short tips to help when something goes wrong with the local demo, tunnel, or services.

- Tunnel shows "Tunnel Unavailable" / 503 interstitial:
	- The loca.lt interstitial may appear for browser visits. The tunnel password is the public IP of the machine running the localtunnel client. On the tunnel host run:
		```bash
		curl https://loca.lt/mytunnelpassword
		```
		Paste that value into the interstitial's password field. To bypass programmatically, send the header `Bypass-Tunnel-Reminder: 1` or a non-standard User-Agent.

- Public tunnel returns 503 or stops intermittently:
	- Check the local tunnel client process and logs:
		```bash
		# pidfile and log used by scripts
		cat /tmp/lt.pid
		tail -n 200 /tmp/lt_run_bg.log
		```
	- If the client crashed, restart it:
		```bash
		./scripts/tunnel-start.sh <subdomain>
		```
	- The repo includes a systemd user service that will restart the client automatically: `mystore-tunnel.service`.

- Systemd service won't start or shows "Invalid environment variable" / "bad option: --port":
	- This usually means ExecStart tried to use unexpanded variables. We patched the unit to use a shell wrapper and added `EnvironmentFile=/path/to/.env`. If you edit the service file, run:
		```bash
		systemctl --user daemon-reload
		systemctl --user restart mystore-tunnel.service
		journalctl --user -u mystore-tunnel.service -n 200 --no-pager
		```

- App not reachable on expected port (tests failing or curl can't connect):
	- The managed server in this workspace runs on port `5001` by default (systemd unit uses PORT=5001). If your scripts expect `5000`, either start the server locally with `npm start` or update the scripts to use the correct port.

- localtunnel not installed or executable errors:
	- The helper scripts expect a local install under `/tmp/lt`. To install:
		```bash
		mkdir -p /tmp/lt && cd /tmp/lt && npm init -y && npm i localtunnel@2.0.2
		```
	- If you prefer not to install to /tmp, update `LT_DIR` in `.env` to point at your install and restart the tunnel service.

- Logs and rotation:
	- Service logs are written to `logs/tunnel.log` and `logs/demo-runner.log` inside the repo. If logs grow large, a user-level `logrotate` timer was added (check `logrotate-mystore.timer`). To run rotation immediately:
		```bash
		systemctl --user start logrotate-mystore.service
		```

- If services fail to restart after env edits:
	- Confirm `.env` syntax (no stray characters) and restart the services:
		```bash
		./scripts/env-edit.sh --print
		systemctl --user restart mystore-tunnel.service mystore-demo-runner.service
		journalctl --user -u mystore-tunnel.service -n 100 --no-pager
		```

- Want to disable the public tunnel during development:
	- Stop the tunnel and disable the service:
		```bash
		systemctl --user stop mystore-tunnel.service mystore-demo-runner.service
		systemctl --user disable mystore-tunnel.service mystore-demo-runner.service
		```

If you hit a specific error message, tell me the exact text and I will diagnose it and propose a targeted fix.
