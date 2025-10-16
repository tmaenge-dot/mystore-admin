#!/usr/bin/env bash
set -euo pipefail
# wait-for-health.sh <url> [attempts]
URL=${1:-}
ATTEMPTS=${2:-10}
SLEEP=${3:-1}
if [[ -z "$URL" ]]; then
  echo "Usage: $0 <url> [attempts] [sleep_seconds]"
  exit 2
fi

i=0
while (( i < ATTEMPTS )); do
  if curl -sS -f -I "$URL" >/dev/null 2>&1; then
    echo "[wait-for-health] ok"
    exit 0
  fi
  i=$((i+1))
  echo "[wait-for-health] attempt $i/$ATTEMPTS failed; sleeping $SLEEPs"
  sleep "$SLEEP"
done

echo "[wait-for-health] service did not respond after $ATTEMPTS attempts"
exit 1
