#!/usr/bin/env bash
# Simple smoke test for docker-compose / podman-compose
set -euo pipefail
HOST=${1:-localhost}
PORT=${2:-5001}
TIMEOUT=${3:-60}
URL="http://${HOST}:${PORT}/api/health"
echo "Waiting for ${URL} (timeout ${TIMEOUT}s) ..."
for i in $(seq 1 $TIMEOUT); do
  if curl -sS "$URL" >/dev/null 2>&1; then
    echo "OK: ${URL} responded"
    exit 0
  fi
  sleep 1
done
echo "ERROR: ${URL} did not respond after ${TIMEOUT}s" >&2

# Attempt to capture docker/podman compose logs for debugging
echo "Collecting compose logs and container status..." >&2
if command -v docker >/dev/null 2>&1; then
  echo "--- docker ps ---" >&2
  docker ps -a >&2 || true
  echo "--- docker compose logs (last 200 lines) ---" >&2
  docker compose logs --no-color --tail=200 >&2 || true
fi
if command -v podman >/dev/null 2>&1; then
  echo "--- podman ps ---" >&2
  podman ps -a >&2 || true
  echo "--- podman compose logs (last 200 lines) ---" >&2
  # try podman compose (plugin) or docker-compose fallback
  if podman compose version >/dev/null 2>&1; then
    podman compose logs --tail=200 >&2 || true
  elif command -v docker-compose >/dev/null 2>&1; then
    docker-compose logs --tail=200 >&2 || true
  fi
fi

exit 2
