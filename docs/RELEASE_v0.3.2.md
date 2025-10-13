# Release notes — v0.3.2

Release title
v0.3.2 — UI polish, secure image uploads & orphan-image cleanup

Short description
Polish storefront UI and Thuso demo assets. Add hardened admin image uploads
(MIME allow-list, safe filenames, 5MB limit) with optional server-side
resizing (Sharp), persist image maps, and include an orphan-image
detection/cleanup script. Tests pass locally (9/9).

Notable changes
- Hardened upload flow: `app.js` (MIME allow-list, size limit, safe filenames)
- Image map persistence: `lib/db.js`
- Orphan image tools: `scripts/cleanup-orphaned-images.js` and CI workflow
- UI polish and demo assets: `public/styles.css`, `public/images/*`
- Tests: `test/` (integration/E2E additions)

How to test locally
1. npm install
2. npm test (should pass)
3. npm run dev and exercise the admin upload UI at `http://localhost:5000`

Links
- PR: https://github.com/tmaenge-dot/mystore-admin/pull/6
- Release: https://github.com/tmaenge-dot/mystore-admin/releases/tag/v0.3.2

Notes
- If you want the release to map to a different commit, create a new tag
  (for example `v0.3.3`) pointing to the desired commit and draft a release
  from that tag.
