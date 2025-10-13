#!/usr/bin/env bash
# Start the local server if not running, then open the storefront on the LAN IP
set -euo pipefail
WORKDIR="/home/oem/mystore/mystore-admin"
cd "$WORKDIR"
PORT=${PORT:-5000}
HOST_IP=${HOST_IP:-192.168.8.114}
# check if a node server is already listening on PORT
if lsof -iTCP:${PORT} -sTCP:LISTEN -P -n >/dev/null 2>&1; then
  echo "Server already listening on ${PORT}"
else
  echo "Starting server in background..."
  nohup node server.js > server.output.log 2>&1 &
  # wait for it to start
  for i in {1..15}; do
    if lsof -iTCP:${PORT} -sTCP:LISTEN -P -n >/dev/null 2>&1; then
      break
    fi
    sleep 0.5
  done
fi
# open the storefront in the default browser
xdg-open "http://${HOST_IP}:${PORT}/" >/dev/null 2>&1 || true
