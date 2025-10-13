# Changelog

All notable changes to this project will be documented in this file.
This project adheres to a simple release-note style; each release entry lists
the headline, short description, and notable files/changes.

## [v0.3.2] - 2025-10-10
### Title
v0.3.2 — UI polish, secure image uploads & orphan-image cleanup

### Summary
Polish storefront UI and Thuso demo assets. Add hardened admin image uploads
(MIME allow-list, safe filenames, 5MB limit) with optional server-side
resizing (Sharp), persist image maps, and include an orphan-image
detection/cleanup script. Integration/E2E tests updated and run locally
(9 passing).

### Notable files / changes
- `app.js` — admin upload handler, validation, optional Sharp resizing
- `lib/db.js` — image map persistence
- `scripts/cleanup-orphaned-images.js` + `.github/workflows/orphan-detect.yml`
  — orphan detection/cleanup tooling
- `public/styles.css` + `public/images/*` — UI polish & Thuso branding
- `test/` — E2E/integration tests
- `package.json` / `package-lock.json` — dependency updates

### Notes
- Release published: https://github.com/tmaenge-dot/mystore-admin/releases/tag/v0.3.2
- PR: https://github.com/tmaenge-dot/mystore-admin/pull/6

---

> Tip: to publish a different commit for this release create a new tag (for
> example `v0.3.3`) pointing at the desired commit and draft a release from
> that tag in the GitHub Releases UI.
