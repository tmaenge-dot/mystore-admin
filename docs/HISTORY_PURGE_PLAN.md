HISTORY PURGE PLAN

This document outlines a safe approach to purge runtime artifacts (logs, data_store files, server.pid, etc.) from repository history using git-filter-repo or BFG. This is optional and rewrites history — coordinate with collaborators before proceeding.

High-level steps

1. Identify the files and commits to remove (example):
   - data_store/*.json
   - logs/*
   - server.output.log
   - server.pid

2. Install git-filter-repo (recommended) or BFG.

3. Make a backup of the repository (clone or bundle):
   git clone --mirror <repo-url> repo-backup.git
   or
   git bundle create repo-backup.bundle --all

4. Run filter-repo (example):
   git clone --mirror <repo-url> repo-filtered.git
   cd repo-filtered.git
   git filter-repo --invert-paths --path data_store --path logs --path server.output.log --path server.pid

5. Verify the repo history locally, then force-push the cleaned history to remote:
   git remote add origin <repo-url>
   git push --force --all
   git push --force --tags

6. Inform collaborators: they must re-clone or reset their remotes (history rewrite will break local clones).

Notes and safety
- This action is destructive for history. Keep a backup and coordinate.
- For small repos, BFG can be simpler; git-filter-repo is more flexible.
- Alternatively, leave history intact and continue with the existing cleaned branch (what we did already).

If you want me to prepare a concrete set of commands and perform the rewrite, say so and provide confirmation that you want history rewritten and that you're prepared to force-push.
