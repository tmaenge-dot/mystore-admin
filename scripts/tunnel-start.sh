#!/usr/bin/env bash
# Start a localtunnel instance using the locally-installed package under /tmp/lt
# Usage: ./scripts/tunnel-start.sh [subdomain]
set -euo pipefail
SUBDOMAIN=${1:-mystore-demo-xyz}
LT_DIR=/tmp/lt
PID_FILE=/tmp/lt.pid
LOG_FILE=/tmp/lt_run_bg.log

if [ -f "$PID_FILE" ]; then
  pid=$(cat "$PID_FILE")
  if kill -0 "$pid" 2>/dev/null; then
    echo "localtunnel already running (pid=$pid)"
    exit 0
  else
    echo "Stale pidfile found, removing"
    rm -f "$PID_FILE"
  fi
fi

if [ ! -d "$LT_DIR/node_modules/localtunnel" ]; then
  echo "localtunnel not installed in $LT_DIR. Please run:"
  echo "  mkdir -p $LT_DIR && cd $LT_DIR && npm init -y && npm i localtunnel@2.0.2"
  exit 2
fi

echo "Starting localtunnel (subdomain=$SUBDOMAIN) ..."
nohup node "$LT_DIR/node_modules/localtunnel/bin/lt.js" --port 5001 --subdomain "$SUBDOMAIN" >"$LOG_FILE" 2>&1 &
pid=$!
echo "$pid" >"$PID_FILE"
sleep 1
echo "localtunnel started (pid=$pid). Log: $LOG_FILE"
echo "Initial output:"
sed -n '1,200p' "$LOG_FILE" || true
