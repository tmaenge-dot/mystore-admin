#!/usr/bin/env bash
set -euo pipefail
# install-service.sh <username>
USER_ARG=${1:-}
if [[ -z "$USER_ARG" ]]; then
  echo "Usage: $0 <username>"
  exit 2
fi
SRC="misc/mystore.service"
DEST="/etc/systemd/system/mystore@${USER_ARG}.service"

echo "This script will copy $SRC to $DEST and enable the service. It will ask for sudo privileges when needed."
read -p "Proceed? [y/N] " yn
if [[ "${yn,,}" != "y" ]]; then
  echo "Aborted"
  exit 0
fi

sudo cp "$SRC" "$DEST"
sudo systemctl daemon-reload
sudo systemctl enable --now "mystore@${USER_ARG}.service"

echo "Service installed and started: mystore@${USER_ARG}.service"

echo "Use: sudo systemctl status mystore@${USER_ARG}.service && sudo journalctl -u mystore@${USER_ARG}.service -f"
