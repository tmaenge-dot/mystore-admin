## PR: Add admin image upload, server-side validation/resizing, orphan cleanup script, and tests

This PR adds secure admin image upload support and image maintenance tooling. It implements multipart upload handling with strict validation, optional server-side processing (sharp), persistence of image maps, automated orphan detection, and full test coverage.

Files/changes of interest:
- app.js — upload handler and middleware
- lib/db.js — image map persistence
- scripts/cleanup-orphaned-images.js and .github/workflows/orphan-detect.yml
- test/ — added E2E/integration tests
- README.md, CONTRIBUTING.md — docs and usage

How to test locally:
1) npm install
2) npm test (should pass)
3) npm run dev and use the admin pages to upload images

Security notes:
- MIME allow-list, size limits, safe filename generation, and optional sharp-based validation/resizing used.
- DEBUG_LOGS=1 enables debug logs. Ensure SESSION_SECRET is set in production.

Please review app.js, lib/db.js, and the test/ files. For questions or to request changes, comment on the PR.
