# Restored branches for protected tags

Summary
-------

During the recent history-purge operation we removed runtime artifacts from the repository history. Several protected tags on the origin were rejected by GitHub (tag protection rules). To make the content available to maintainers without changing protected tag protections, we created non-destructive branches from the backup bundle containing the original tag targets.

Restore branches created
-----------------------

The following branches have been created and pushed to origin for review and use. They contain the commits those tags previously pointed to.

- `restore/tag-v0.3.0`  — from tag `v0.3.0`
- `restore/tag-v0.3.1`  — from tag `v0.3.1`
- `restore/tag-v0.3.2`  — from tag `v0.3.2`
- `restore/tag-v0.3.4`  — from tag `v0.3.4`
- `restore/tag-v0.3.5`  — from tag `v0.3.5`
- `restore/tag-v0.3.6`  — from tag `v0.3.6`

How to use these branches
-------------------------

- Inspect the branches on GitHub and create PRs if you want to merge or cherry-pick content back into mainline branches.
- If you want tags to point at the cleaned history instead, a repository administrator must temporarily disable tag protection for the affected tags and the cleaned tags can be pushed (this is destructive). See `docs/PROTECTED_TAGS_GUIDE.md` for the admin steps.
- Alternatively, maintainers can re-create tags from these branches locally and then push tags in a controlled manner.

Suggested maintainer steps (non-destructive)
-------------------------------------------

1. Visit the branch page for each restore branch (example):

   https://github.com/tmaenge-dot/mystore-admin/tree/restore/tag-v0.3.0

2. Create a PR if you want to merge changes into `main` or another branch.

3. To recreate a tag from a branch locally:

```bash
git fetch origin
git checkout -b tmp-restore-branch origin/restore/tag-v0.3.0
git tag -a v0.3.0-restored -m "Restored tag v0.3.0 from backup bundle"
git push origin v0.3.0-restored
```

Contact & verification
----------------------

If you need me to open draft PRs for these branches with suggested descriptions, or to re-run the destructive mirror push after tag protections are temporarily removed, tell me which action you prefer and I will proceed.
