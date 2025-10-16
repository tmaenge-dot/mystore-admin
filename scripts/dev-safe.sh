#!/usr/bin/env bash
set -euo pipefail
# dev-safe.sh - safe wrapper to ensure port 5000 is free, remove stale pid, start nodemon, and wait for health
ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
PIDFILE="$ROOT_DIR/server.pid"
PORT=5000
NODemon_CMD="npx nodemon server.js"

echo "[dev-safe] Checking for process listening on port $PORT..."
if ss -ltnp "sport = :$PORT" | grep -q ":$PORT"; then
  echo "[dev-safe] Port $PORT appears in use. Attempting graceful shutdown..."
  PID=$(ss -ltnp "sport = :$PORT" | awk -F 'pid=' '/:5000/{print $2}' | awk -F ',' '{print $1}' | head -n1)
  if [[ -n "$PID" ]]; then
    echo "[dev-safe] Killing PID $PID"
    kill "$PID" || true
    sleep 1
    if ps -p "$PID" >/dev/null 2>&1; then
      kill -TERM "$PID" || true
      sleep 1
      if ps -p "$PID" >/dev/null 2>&1; then
        kill -KILL "$PID" || true
      fi
    fi
  fi
fi

if [[ -f "$PIDFILE" ]]; then
  echo "[dev-safe] Removing stale pid file: $PIDFILE"
  rm -f "$PIDFILE"
fi

# Start nodemon in background
echo "[dev-safe] Starting nodemon..."
# Use exec so signal handling works, but run via bash -c so we capture it in logs
bash -c "$NODemon_CMD" &
NODEMON_PID=$!
sleep 0.5
# Record pid
echo "$NODEMON_PID" > "$PIDFILE"

# Wait for health
echo "[dev-safe] Waiting for HTTP health on http://127.0.0.1:$PORT..."
"$ROOT_DIR/scripts/wait-for-health.sh" "http://127.0.0.1:$PORT" 20

echo "[dev-safe] nodemon (PID $NODEMON_PID) started and service is healthy."
wait $NODEMON_PID

