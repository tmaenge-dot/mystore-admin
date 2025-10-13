#!/usr/bin/env bash
# Edit or set variables in the repo .env file and optionally restart services.
# Usage:
#  ./scripts/env-edit.sh --print               # show current values
#  ./scripts/env-edit.sh --edit                # open $EDITOR to edit .env (creates from template if missing)
#  ./scripts/env-edit.sh --set KEY=VAL [KEY=VAL ...]  # set key(s) non-interactively and restart services

set -euo pipefail
ENV_FILE="$(pwd)/.env"
TEMPLATE="$(pwd)/.env.template"
SERVICES=(mystore-tunnel.service mystore-demo-runner.service)

function ensure_env(){
  if [ ! -f "$ENV_FILE" ]; then
    if [ -f "$TEMPLATE" ]; then
      cp "$TEMPLATE" "$ENV_FILE"
      echo "Created $ENV_FILE from template"
    else
      touch "$ENV_FILE"
    fi
  fi
}

function print_env(){
  echo "Current .env content:";
  echo "---------------------";
  if [ -f "$ENV_FILE" ]; then sed -n '1,200p' "$ENV_FILE"; else echo "(none)"; fi
}

function set_vars(){
  local changed=false
  for kv in "$@"; do
    if [[ "$kv" != *=* ]]; then
      echo "Invalid assignment: $kv"; exit 1
    fi
    key=${kv%%=*}
    val=${kv#*=}
    ensure_env
    if grep -qE "^${key}=" "$ENV_FILE"; then
      # replace line
      sed -i.bak -E "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
      changed=true
    else
      echo "${key}=${val}" >> "$ENV_FILE"
      changed=true
    fi
  done
  if [ "$changed" = true ]; then
    echo "Updated $ENV_FILE"
    for s in "${SERVICES[@]}"; do
      echo "Restarting $s..."
      systemctl --user restart "$s" || echo "Failed to restart $s"
    done
  else
    echo "No changes made"
  fi
}

function edit_env(){
  ensure_env
  : ${EDITOR:=vi}
  "$EDITOR" "$ENV_FILE"
  echo "Saved $ENV_FILE. Restarting services..."
  for s in "${SERVICES[@]}"; do
    systemctl --user restart "$s" || echo "Failed to restart $s"
  done
}

if [ $# -eq 0 ]; then
  print_env
  exit 0
fi

case "$1" in
  --print)
    print_env
    ;;
  --edit)
    edit_env
    ;;
  --set)
    shift
    if [ $# -eq 0 ]; then echo "usage: $0 --set KEY=VAL ..."; exit 1; fi
    set_vars "$@"
    ;;
  *)
    # allow direct KEY=VAL pairs as arguments
    if [[ "$1" == *=* ]]; then
      set_vars "$@"
    else
      echo "Unknown option: $1"; echo "Usage: --print | --edit | --set KEY=VAL"; exit 1
    fi
    ;;
esac
