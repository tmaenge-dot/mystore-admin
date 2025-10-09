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

---

Post-merge notes and current status (automated checks run locally):

- Local test suite: 9/9 tests passed (run on branch `backup-before-audit-force` after applying a forced audit fix).
- I created a local backup branch `backup-before-audit-force` and applied `npm audit fix --force` there so reviewers can inspect dependency changes separately.
- The forced audit fix changed `package.json` and `package-lock.json`; some high-severity advisories remain that require manual code changes to upgrade major versions of packages (notably CSRF-related and multipart handling libraries).

Reviewer checklist

- [ ] Inspect `app.js` and `lib/db.js` changes for any security or behavior concerns.
- [ ] Run the test suite locally (`npm install && npm test`) to reproduce the green tests.
- [ ] Optionally run `npm run dev` and exercise the admin upload UI at `http://localhost:5000`.
- [ ] If you want the forced dependency changes applied on the mainline, either review and merge the `backup-before-audit-force` branch or request I open a PR from that branch. Otherwise we can revert and upgrade deps incrementally.

If you'd like, I can push the backup branch and open a PR for the dependency changes, or instead revert the forced fix and proceed with incremental, focused upgrades.

Branches & PRs

- `audit-fix-only` (remote): dependency-only branch that contains the forced `npm audit fix --force` changes. Create a PR in the browser:

	https://github.com/tmaenge-dot/mystore-admin/pull/new/audit-fix-only

- `backup-before-audit-force` (local): branch used to test the forced audit fix and then reverted; it exists locally and contains the revert commit.

- `upgrade-multer-csurf` (local/branch): targeted upgrade branch with `multer` and `csurf` updated; tests passed locally.

Commands you can run locally to inspect or open PRs:

```bash
# show branches
git branch --all

# push a local branch and open a PR (browser)
git push --set-upstream origin <branch-name>
# then visit the URL printed by git or use GitHub's web UI to create the PR
```

If you want me to open the PR programmatically from this environment I can try again if you provide a GitHub token with `repo` scope (the environment token returned 401/403 for PR creation earlier). Otherwise the browser link above will create the PR instantly.

Visuals & Test Summary
----------------------

The following screenshot shows the customer store page with the newly added placeholder logo and served assets. The image is included in this branch so reviewers can preview it directly:

- Screenshot: `/public/images/store_screenshot.png` (served at `/images/store_screenshot.png`)

Automated tests (local results):

- Test suite: 9 passed, 0 failed (ran on branch `upgrade-csurf-1.2.2` after upgrading `csurf` to 1.2.2)

If you'd like a higher-resolution screenshot or additional screenshots (admin upload flow, confirmation pages), tell me which pages and viewport size and I'll add them.
