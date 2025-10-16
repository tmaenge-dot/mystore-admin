Title: Announce restored branches for protected tags (non-destructive)

Body:

This PR announces non-destructive "restore" branches that were created from the pre-purge backup bundle to make the original tag targets available without changing protected tags on origin.

Why
---
- A history purge was performed to remove runtime artifacts from the repository. Several protected tags were rejected by GitHub during the destructive push (repository tag protection rules). To avoid changing protected refs, we created branches that contain the original tag commits so maintainers can inspect and recover content safely.

Restore branches
----------------
- `restore/tag-v0.3.0`  — from tag `v0.3.0`
- `restore/tag-v0.3.1`  — from tag `v0.3.1`
- `restore/tag-v0.3.2`  — from tag `v0.3.2`
- `restore/tag-v0.3.4`  — from tag `v0.3.4`
- `restore/tag-v0.3.5`  — from tag `v0.3.5`
- `restore/tag-v0.3.6`  — from tag `v0.3.6`

What to do
----------
Recommended non-destructive options for maintainers:

1. Inspect the branches on GitHub and open a PR from a `restore/tag-*` branch if you want to merge or cherry-pick content back into `main`.
2. To recreate a tag locally and push a non-protected tag (recommended approach):

```bash
git fetch origin
git checkout -b tmp-restore origin/restore/tag-v0.3.0
git tag -a v0.3.0-restored -m "Restored tag v0.3.0 from backup bundle"
git push origin v0.3.0-restored
```

3. If you need the cleaned tags to replace the protected tags on origin (destructive): a repository admin must temporarily disable tag protection for the affected tags. Once protections are removed, we can re-run the cleaned mirror push to update tags. See `docs/PROTECTED_TAGS_GUIDE.md`.

Checklist for reviewers
----------------------
- [ ] Verify the branch content matches the expected release artifacts or commit history.
- [ ] If re-creating tags, consider naming them `-restored` or doing the operation behind a maintenance window.
- [ ] Merge or cherry-pick into mainline branches only after review.

Notes
-----
- The original backup bundle is stored at `/tmp/mystore-admin-backup.bundle` in the environment where the purge was run.
- If you want me to open draft PRs for each restore branch (one PR per branch) I can do that — say so and I will create draft PRs with this body.
