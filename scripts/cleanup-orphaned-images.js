#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';

const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '..');
const IMAGES_DIR = path.join(ROOT, 'public', 'images');
const DATA_STORE = path.join(ROOT, 'data_store');

async function listImageFiles() {
  try {
    const files = await fs.readdir(IMAGES_DIR);
    return files.filter(f => f && !f.startsWith('.'));
  } catch (err) {
    console.error('Failed to read images directory:', err.message);
    return [];
  }
}

async function listImageMapFiles() {
  try {
    const files = await fs.readdir(DATA_STORE);
    return files.filter(f => f.startsWith('images_') && f.endsWith('.json'));
  } catch (err) {
    console.error('Failed to read data_store directory:', err.message);
    return [];
  }
}

async function readImageMaps() {
  const mapFiles = await listImageMapFiles();
  const urls = new Set();
  for (const mf of mapFiles) {
    try {
      const content = await fs.readFile(path.join(DATA_STORE, mf), 'utf8');
      const obj = JSON.parse(content);
      Object.values(obj).forEach(v => {
        if (typeof v === 'string' && v.includes('/images/')) {
          urls.add(path.basename(v));
        }
      });
    } catch (err) {
      console.error('Failed to read/parse', mf, err.message);
    }
  }
  return urls;
}

function usage() {
  console.log('Usage: cleanup-orphaned-images.js [--delete]');
  console.log('  --delete   Actually delete orphaned files. Without it the script runs in dry-run mode.');
}

async function run() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    usage();
    process.exit(0);
  }
  const doDelete = args.includes('--delete');

  const files = await listImageFiles();
  const referenced = await readImageMaps();

  const orphans = files.filter(f => !referenced.has(f));

  if (orphans.length === 0) {
    console.log('No orphaned images found.');
    return;
  }

  console.log(`Found ${orphans.length} orphaned image(s):`);
  orphans.forEach(f => console.log('  ', f));

  if (doDelete) {
    for (const f of orphans) {
      try {
        await fs.unlink(path.join(IMAGES_DIR, f));
        console.log('Deleted', f);
      } catch (err) {
        console.error('Failed to delete', f, err.message);
      }
    }
  } else {
    console.log('\nRun with --delete to remove these files.');
  }
}

run().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
