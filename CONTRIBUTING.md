# Contributing

Maintenance scripts

This repository includes a small maintenance script to find orphaned images in `public/images` that are not referenced by any `data_store/images_*.json` file.


```bash
# dry-run (lists orphans)
npm run cleanup-orphans

# actually delete orphaned files
npm run cleanup-orphans -- --delete
```

If the repository is configured with the `Orphaned image detection` workflow, the detection will run on a daily schedule and will post a comment to an existing maintenance issue (or create one) with the output.

nodemon and runtime artifacts
----------------------------

The project writes runtime artifacts such as logs and a local file DB into `data_store/` and `logs/`. Those files should not be committed to the repository and can cause noise in development (for example, nodemon may restart when a log file changes).

- We include `nodemon.json` which narrows the files/directories nodemon watches and explicitly ignores runtime artifacts. If you change this file, commit the change so the team benefits from the improved defaults.
- Before committing, run `git status` and ensure files under `data_store/`, `logs/`, `server.output.log`, and `server.pid` are not staged.

Starting the dev server
-----------------------

Use the helper scripts for predictable behavior:

```bash
npm install
npm run dev   # uses nodemon with nodemon.json
# or start in background
npm start
```

If you see EADDRINUSE or port conflicts, use the provided helper:

```bash
./scripts/restart-server.sh
```
