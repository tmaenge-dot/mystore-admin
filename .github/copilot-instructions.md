# Copilot instructions for MyStore Admin

Short actionable guidance to help AI coding agents be productive in this repo.

1. Big picture
   - This is a minimal Express.js backend (ES modules) that serves a simple admin landing page.
   - Primary entrypoints: `index.js` and `app.js`. `index.js` is the main server (port 5000).
   - No database, no routing layers, no front-end build tooling present in this repo.

2. Key files
   - `package.json` — scripts: `start` (node server.js), `dev` (nodemon server.js). Use `type: "module"`.
   - `index.js` — thin launcher (starts the server) and exports `{ app, server }` for tests.
   - `server.js` — new canonical start point that imports `app` and starts the HTTP server.
   - `app.js` — primary Express app (exports `app`). Contains API routes and `GET /stores/:id` responsive pages.
   - `data/` — seed data for demo stores and products: `data/stores.js`, `data/products.js`.
   - `test.html` — static HTML used to demonstrate document.compatMode (quirks vs standards). Useful for browser checks.

3. Development workflows and commands
   - Run in development with live reload:

     ```bash
     npm install
     npm run dev
     ```

   - Run production server locally:

     ```bash
     npm start
     ```

   - The server logs the URL on start: `http://localhost:5000`.

   APIs added in this repo

   - GET `/api/health` — { ok: true, uptime }
   - GET `/api/stores` — list of stores (from `data/stores.js`)
   - GET `/api/stores/:id` — store metadata
   - GET `/api/stores/:id/products` — products for the store (from `data/products.js`)
   - GET `/api/stores/:id/products/:productId` — product detail
   - GET `/api/stores/:id/cart` — get persisted cart (file DB)
   - POST `/api/stores/:id/cart` — save cart server-side
   - POST `/api/stores/:id/orders` — create an order (server computes totals)
   - GET `/api/stores/:id/orders` — list orders
   - GET `/api/stores/:id/orders/:orderId` — get order detail
   - GET `/stores/:id` — responsive store landing page that fetches `/api/stores/:id/products`
   - GET `/stores/:id/cart` — client cart page (reads localStorage and can save/checkout)
   - GET `/stores/:id/orders/:orderId` — confirmation page for an order

4. Conventions and patterns in this repo
   - ESM modules (package.json contains `type: "module"`) — import with `import X from "y"`.
   - Minimal middleware: `cors()` and `express.json()`.
   - Port constant defined near top of `index.js` (PORT = 5000) and hardcoded in `app.js` (5000). When editing, keep consistent.
   - HTML strings are embedded directly inside route handlers. Prefer extracting to small templates only if complexity increases.

5. Integration points and external dependencies
   - Dependencies: `express`, `cors`. Dev: `nodemon`, `supertest` (tests).
   - Seed data currently lives in `data/`. To replace with a DB, implement the API routes to query your DB and document the required env vars in `README.md`.

6. Safe edits and tests for AI agents
   - Small changes are safe; to verify, run `npm run dev` and open `http://localhost:5000` in a browser or curl it:

     ```bash
     curl -sS http://localhost:5000 | head -n 20
     ```

   - If adding new routes, create automated tests under `test/` (we use Node's builtin test runner + `supertest`). Run with `npm test`.
   - CI: GitHub Actions workflow is in `.github/workflows/nodejs.yml` and runs `npm ci` + `npm test` on push/PR.
    - Docker: a `Dockerfile` and `docker-compose.yml` are provided. `data_store/` is mounted as a volume for persisted carts/orders.
    - Tests cover positive and negative cases (missing payloads, product missing). Run with `npm test`.

7. Examples / patterns to follow
   - To add a JSON API route, mirror existing middleware usage and return JSON:

     - Add:
       ```js
       app.get('/api/health', (req, res) => res.json({ok: true}));
       ```

   - When starting servers for dev, use `nodemon index.js` (already in `package.json`).

8. What NOT to change without verification
   - Do not change `type: "module"` to CommonJS without updating imports/exports across files.
   - Avoid changing the default port (5000) unless updating all references.

9. Where to look next
   - If expanding the project, add a `README.md` documenting env vars, ports, and any external services.
   - Consider centralizing server setup in `app.js` and importing it from `index.js` to keep a single start point.

If anything in this summary is unclear or you'd like me to add more examples (e.g., testing snippets, env var patterns, or refactors), tell me what to expand and I'll update this file.