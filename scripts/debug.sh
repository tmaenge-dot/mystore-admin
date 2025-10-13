#!/usr/bin/env bash
# Quick debug helper for local dev and demos
# Runs common checks: node/npm versions, git branch, basic npm test (no watch), HTTP probe, port listener, disk usage, and tail recent logs.

set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"

echo "== Environment =="
echo "Node: $(node -v 2>/dev/null || echo 'not installed')"
echo "NPM:  $(npm -v 2>/dev/null || echo 'not installed')"
echo "PWD:  $DIR"

echo "\n== Git =="
git rev-parse --abbrev-ref HEAD || true
git status --short --branch | sed -n '1,5p' || true

echo "\n== App process (port 5001) =="
if command -v ss >/dev/null 2>&1; then
  ss -ltnp 'sport = :5001' || ss -ltn 'sport = :5001' || true
else
  netstat -ltnp 2>/dev/null | grep ':5001' || true
fi

echo "\n== HTTP probe (/probe) =="
if command -v curl >/dev/null 2>&1; then
  curl -fsS --max-time 5 http://127.0.0.1:5001/probe || echo "probe failed"
else
  echo "curl missing; cannot probe"
fi

echo "\n== Quick npm test (first 20s) =="
if [ -f package.json ] && command -v npm >/dev/null 2>&1; then
  # Run tests but kill after 20s to keep this fast when CI may hang
  (npm test --silent) &
  TEST_PID=$!
  sleep 20
  if kill -0 "$TEST_PID" 2>/dev/null; then
    echo "Tests still running after 20s; killing to keep debug fast"
    kill "$TEST_PID" || true
  fi
else
  echo "npm or package.json missing; skipping tests"
fi

echo "\n== Disk usage (project root) =="
du -sh . || true

echo "\n== Recent logs (logs/*.log, last 200 lines) =="
if [ -d logs ]; then
  for f in logs/*.log; do
    [ -e "$f" ] || continue
    echo "\n--- $f ---"
    tail -n 200 "$f" || true
  done
else
  echo "no logs/ directory"
fi

echo "\n== Orphaned images summary (count in public/images) =="
if [ -d public/images ]; then
  find public/images -type f | wc -l
else
  echo "no public/images directory"
fi

echo "\n== Done =="
