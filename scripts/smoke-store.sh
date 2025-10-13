#!/usr/bin/env bash
# smoke-store.sh — resilient smoke checks for the store frontend and API
# Usage: ./scripts/smoke-store.sh [storeId]
# Environment:
#   BASE (default http://localhost:5000)
#   RETRIES (default 5)
#   DELAY (seconds between retries, default 1)
#   CURL_TIMEOUT (per-request curl timeout seconds, default 10)

set -euo pipefail

STORE=${1:-choppies}
BASE=${BASE:-http://localhost:5000}
RETRIES=${RETRIES:-8}
DELAY=${DELAY:-2}
CURL_TIMEOUT=${CURL_TIMEOUT:-15}

if ! command -v jq >/dev/null 2>&1; then
  echo "Error: jq is required. Install jq and retry."
  exit 1
fi

retry_cmd(){ # retry_cmd <attempts> <delay> -- <cmd...>
  local attempts=${1:-3}; shift; local delay=${1:-1}; shift; local i=0
  while true; do
    if "$@"; then return 0; fi
    i=$((i+1))
    if [ $i -ge $attempts ]; then return 1; fi
    sleep "$delay"
  done
}

retry_capture(){ # retry_capture <attempts> <delay> <cmd...>
  local attempts=${1:-3}; shift; local delay=${1:-1}; shift; local i=0
  local out
  while true; do
    if out=$("$@" 2>/dev/null); then printf '%s' "$out"; return 0; fi
    i=$((i+1))
    if [ $i -ge $attempts ]; then return 1; fi
    sleep "$delay"
  done
}

echo "Waiting for server at $BASE (retries=$RETRIES delay=${DELAY}s)"
if ! retry_cmd $RETRIES $DELAY curl -sS -m $CURL_TIMEOUT "$BASE/" >/dev/null 2>&1; then
  echo "Server did not respond at $BASE" >&2
  exit 2
fi

echo "Resolving a product id for store '$STORE'"
PRODUCT_ID=$(retry_capture $RETRIES $DELAY curl -sS -m $CURL_TIMEOUT "$BASE/api/stores/$STORE/products" | jq -r '.[0].id // empty' || true)
if [ -z "$PRODUCT_ID" ]; then
  echo "Could not determine a product id for store '$STORE' — ensure products exist" >&2
  exit 3
fi

echo "Using product id: $PRODUCT_ID"

echo "Fetching store page for $STORE (5 samples)"
> /tmp/smoke-times.txt
for i in 1 2 3 4 5; do
  # each fetch is retried internally and should emit the time_total value
  if ! t=$(retry_capture $RETRIES $DELAY curl -sS -m $CURL_TIMEOUT -w "%{time_total}" -o /dev/null "$BASE/stores/$STORE"); then
    # Fallback: perform a single curl to get a timing (may fail)
    t=$(curl -sS -m $CURL_TIMEOUT -w "%{time_total}" -o /dev/null "$BASE/stores/$STORE" || echo "0")
  fi
  printf "%s\n" "$t"
done | tee /tmp/smoke-times.txt

python3 - <<PY
import sys
vals=[float(x) for x in open('/tmp/smoke-times.txt').read().strip().split() if x]
if not vals:
    print('no timings collected')
    sys.exit(4)
print('min',min(vals),'max',max(vals),'avg',sum(vals)/len(vals))
PY

echo "Running checkout smoke via API with product id $PRODUCT_ID"
retry_cmd $RETRIES $DELAY curl -sS -X POST -m $CURL_TIMEOUT -H "Content-Type: application/json" -d "{\"items\":[{\"id\":\"$PRODUCT_ID\",\"qty\":1}],\"payment\":{\"token\":\"tok_test\"}}" "$BASE/api/stores/$STORE/checkout" | jq .
