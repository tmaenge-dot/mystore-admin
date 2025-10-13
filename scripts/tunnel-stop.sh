#!/usr/bin/env bash
# Stop the localtunnel instance started by tunnel-start.sh
set -euo pipefail
PID_FILE=/tmp/lt.pid
LOG_FILE=/tmp/lt_run_bg.log

if [ ! -f "$PID_FILE" ]; then
  echo "No pidfile found at $PID_FILE. Is the tunnel running?"
  exit 0
fi

pid=$(cat "$PID_FILE")
if kill -0 "$pid" 2>/dev/null; then
  echo "Stopping localtunnel (pid=$pid)"
  kill "$pid"
  sleep 1
  if kill -0 "$pid" 2>/dev/null; then
    echo "Process still running; sending SIGKILL"
    kill -9 "$pid" || true
  fi
else
  echo "Process $pid not running"
fi

rm -f "$PID_FILE"
echo "Logs are in $LOG_FILE"
