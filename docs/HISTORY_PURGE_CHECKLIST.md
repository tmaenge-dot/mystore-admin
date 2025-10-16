HISTORY PURGE CHECKLIST
======================

Purpose
-------
This checklist and helper script (`scripts/purge-history.sh`) assist with safely removing runtime artifacts (for example `data_store/`, `logs/`, `server.output.log`, `server.pid`) from git history using a mirror + git-filter-repo workflow.

High level steps
----------------
1. Backup the repository (create a bundle and/or mirror). This script will create a mirror for you.
2. Run a preview (non-destructive):

   ./scripts/purge-history.sh preview

   - This creates a mirror in `repo-filter.git`, runs the filter, and writes a report to `/tmp/mystore-filter-report`.
   - Inspect the report and verify the list of commits/objects affected.

3. (Optional) Re-run with modified paths if needed.

4. Finalize the purge (destructive):

   PURGE_RUN=1 ./scripts/purge-history.sh run

   - The script requires the environment variable `PURGE_RUN=1` to run in destructive mode.
   - It also prompts for an explicit `YES` confirmation before pushing.
   - Before running this, make a backup bundle:

     git bundle create /tmp/mystore-admin-backup.bundle --all

   - Store the bundle somewhere safe (external drive, cloud storage, etc.).

5. After a successful force-push:

   - Inform all collaborators to re-clone or run a local recovery workflow.
   - Suggested message for collaborators:

     We have rewritten history to remove runtime artifacts. Please re-clone or run:

       git fetch --all --prune
       git reset --hard origin/main

     Replace `main` with whatever branch you're using.

Warnings and best practices
---------------------------
- Always operate on a mirror; never run git-filter-repo directly in your working clone unless you fully understand the consequences.
- Force-pushing rewritten history will replace SHAs for all affected commits and tags. This will break local clones that have the old history.
- Communicate widely before doing destructive pushes. Prefer a maintenance window and coordinate with team members.
- Keep backups (git bundle, clone, or server-side snapshot) before the destructive step.

Customization
-------------
- To change which paths are removed, edit `scripts/purge-history.sh` and update the `TARGET_PATHS` array.
- If you already have `git-filter-repo` installed, the script will use it from `/tmp/git-filter-repo.py`. You can adjust the path or pre-install `git-filter-repo` and modify the script to skip the download.

Quick recovery checklist (if something goes wrong)
------------------------------------------------
1. Restore from the bundle:

   git clone /tmp/mystore-admin-backup.bundle mystore-admin-restore

2. Verify the restored clone and push to a new remote or branch for manual reconciliation.

Contact
-------
If you need help running this workflow or want me to run a preview again, say "preview" and I'll recreate the mirror and run the filter non-destructively.
