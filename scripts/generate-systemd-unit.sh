#!/usr/bin/env bash
set -euo pipefail
# generate-systemd-unit.sh <username>
USER_ARG=${1:-}
if [[ -z "$USER_ARG" ]]; then
  echo "Usage: $0 <username>"
  exit 2
fi
TEMPLATE="$(dirname "$0")/../misc/mystore.service"
OUT="/tmp/mystore@${USER_ARG}.service"

if [[ ! -f "$TEMPLATE" ]]; then
  echo "Template not found: $TEMPLATE"
  exit 1
fi

sed -e "s|User=%i|User=${USER_ARG}|g" -e "s|WorkingDirectory=/home/%i/mystore-admin|WorkingDirectory=/home/${USER_ARG}/mystore-admin|g" "$TEMPLATE" > "$OUT"
chmod 644 "$OUT"

echo "Generated systemd unit at: $OUT"
echo "To install: sudo cp $OUT /etc/systemd/system/mystore@${USER_ARG}.service && sudo systemctl daemon-reload && sudo systemctl enable --now mystore@${USER_ARG}.service"
