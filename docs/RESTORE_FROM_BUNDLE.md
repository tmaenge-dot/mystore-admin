# Restore from backup bundle (non-destructive)

If the history purge removed data you still need on origin but you don't want to modify protected tags, use the non-destructive restore flow:

1. Locate the backup bundle created before the purge (example):

   /tmp/mystore-admin-backup.bundle

2. Run the helper script to extract one or more paths into a new branch (it creates an ephemeral clone under /tmp):

   ./scripts/restore-from-bundle.sh /tmp/mystore-admin-backup.bundle data_store/ images_upload_test_store.json

3. The script creates a new branch (named restore-from-bundle-YYYYMMDDHHMMSS) in the ephemeral clone. To publish the branch to origin (non-destructive):

   git -C /tmp/mystore-restore-*/ push origin <branch-name>

4. After pushing, collaborators can inspect the branch on GitHub and re-create tags or cherry-pick commits as needed without changing protected refs.

Notes:
- This flow avoids touching protected tags. An admin is required to update protected tags if you want the cleaned tag SHAs pushed to origin.
- The script copies the requested paths present in the bundle clone and commits them on a new branch. If a path is missing, it will be reported.
- After verifying the pushed branch, you can delete the ephemeral clone and branch when finished.
