# Contributing

Maintenance scripts

This repository includes a small maintenance script to find orphaned images in `public/images` that are not referenced by any `data_store/images_*.json` file.

- Script: `scripts/cleanup-orphaned-images.js`
- Usage:

```bash
# dry-run (lists orphans)
npm run cleanup-orphans

# actually delete orphaned files
npm run cleanup-orphans -- --delete
```

If the repository is configured with the `Orphaned image detection` workflow, the detection will run on a daily schedule and will post a comment to an existing maintenance issue (or create one) with the output.
