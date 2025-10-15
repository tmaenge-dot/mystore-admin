#!/usr/bin/env bash
set -euo pipefail

# Safe server restart helper for the mystore-admin app.
# - frees port 5000 if occupied
# - removes stale server.pid
# - starts the server in background and writes new pid to server.pid
# - prints a short HTTP verification

PORT=${PORT:-5000}

log() { printf '%s %s\n' "$(date -Is)" "$*"; }

log "Checking for process listening on port $PORT..."
PID=$(lsof -nP -iTCP:${PORT} -sTCP:LISTEN -t 2>/dev/null || true)
if [ -n "$PID" ]; then
  log "Found listener on port $PORT: PID $PID. Stopping..."
  kill "$PID" || true
  sleep 1
  if ps -p "$PID" >/dev/null 2>&1; then
    log "PID $PID still alive, sending TERM"
    kill -TERM "$PID" || true
    sleep 1
  fi
  if ps -p "$PID" >/dev/null 2>&1; then
    log "PID $PID still alive, sending KILL"
    kill -KILL "$PID" || true
  fi
else
  log "No process listening on port $PORT"
fi

if [ -f server.pid ]; then
  SPID=$(cat server.pid)
  if [ -n "$SPID" ] && ps -p "$SPID" >/dev/null 2>&1; then
    log "server.pid exists and points to running PID $SPID"
  else
    log "server.pid is stale (points to ${SPID:-<empty>}); removing"
    rm -f server.pid
  fi
fi

log "Starting server in background (output -> server.output.log)"
nohup npm start > server.output.log 2>&1 & echo $! > server.pid
sleep 1
NEWPID=$(cat server.pid 2>/dev/null || echo "")
log "New server PID: ${NEWPID:-<unknown>}"
log "Verifying HTTP on http://localhost:${PORT}"
curl -IsS http://localhost:${PORT} | head -n 10 || true

log "Done."
