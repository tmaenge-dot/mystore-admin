#!/usr/bin/env bash
# Demo runner: start server, start tunnel, print public URL, optional auto-stop
set -euo pipefail
WORKDIR="/home/oem/mystore/mystore-admin"
cd "$WORKDIR"

AUTO_STOP_MINUTES=0
SUBDOMAIN=${1:-mystore-demo-xyz}
if [ "${2:-}" = "--auto-stop" ] && [ -n "${3:-}" ]; then
  AUTO_STOP_MINUTES=${3}
fi

echo "Demo runner: subdomain=$SUBDOMAIN auto-stop=${AUTO_STOP_MINUTES}m"

# 1) Ensure server is running: try systemd user service, else start via start-local.sh
if systemctl --user status mystore-admin.service >/dev/null 2>&1; then
  echo "Starting systemd user service mystore-admin.service (if not active)"
  systemctl --user start mystore-admin.service || true
else
  echo "systemd user unit not found or systemctl --user unavailable; using scripts/start-local.sh"
  ./scripts/start-local.sh
fi

# 2) Start localtunnel using helper script
echo "Starting tunnel (subdomain=$SUBDOMAIN)..."
./scripts/tunnel-start.sh "$SUBDOMAIN"

# 3) Wait for the public URL in the tunnel log
LOG=/tmp/lt_run_bg.log
PID_FILE=/tmp/lt.pid
echo "Waiting for tunnel to report URL in $LOG"
for i in {1..30}; do
  if [ -f "$LOG" ]; then
    url=$(sed -n '1,200p' "$LOG" | sed -n '1p' | sed -n 's/.*https:\/\///p' 2>/dev/null || true)
    # try to find a line like: your url is: https://... or https://<subdomain>.loca.lt
    match=$(grep -Eo 'https?://[A-Za-z0-9._-]+' "$LOG" 2>/dev/null | head -n1 || true)
    if [ -n "$match" ]; then
      PUBLIC_URL=$match
      break
    fi
  fi
  sleep 1
done

if [ -z "${PUBLIC_URL:-}" ]; then
  echo "Could not find public URL in $LOG; check the log file for details:";
  tail -n 40 "$LOG" || true
  exit 1
fi

echo "Tunnel public URL: $PUBLIC_URL"

if [ "$AUTO_STOP_MINUTES" -gt 0 ]; then
  echo "Will auto-stop tunnel after $AUTO_STOP_MINUTES minutes"
  ( sleep $((AUTO_STOP_MINUTES * 60)) && echo "Auto-stop timer expired; stopping tunnel" && ./scripts/tunnel-stop.sh ) &
fi

echo "Demo runner finished. To stop the tunnel manually: ./scripts/tunnel-stop.sh"
