#!/usr/bin/env bash
#! /bin/bash
set -euo pipefail
# restore-from-bundle.sh - restore files or commits from the backup bundle into a new branch
# Usage: ./scripts/restore-from-bundle.sh /tmp/mystore-admin-backup.bundle path/to/file [path/to/another]

if [ "$#" -lt 2 ]; then
  echo "Usage: $0 /path/to/bundle.bundle path1 [path2 ...]" >&2
  exit 2
fi

BUNDLE="$1"
shift
FILES=("$@")

OUTDIR="/tmp/mystore-restore-$(date +%s)"
echo "Creating restore workspace: ${OUTDIR}"
git clone "${BUNDLE}" "${OUTDIR}"
cd "${OUTDIR}"

BR_NAME="restore-from-bundle-$(date +%Y%m%d%H%M%S)"
git checkout -b "${BR_NAME}"

echo "Extracting requested paths into branch ${BR_NAME}:"
for p in "${FILES[@]}"; do
  echo " - $p"
done

# Create a temp directory with the requested files from the bundle (this is a full clone so files are present)
mkdir -p extracted
for p in "${FILES[@]}"; do
  if [ -e "$p" ]; then
    mkdir -p "$(dirname "extracted/$p")" || true
    cp -a "$p" "extracted/$p"
  else
    echo "Warning: path not found in bundle clone: $p" >&2
  fi
done

# Make a commit with the extracted files
rm -rf tmp-restore || true
mkdir -p tmp-restore
cp -a extracted/* tmp-restore/ || true
git rm -rf --quiet . || true
cp -a tmp-restore/. . || true
git add -A
git commit -m "restore: extracted paths from backup bundle: ${FILES[*]}" || true

echo "Created branch ${BR_NAME} with restored content. You can inspect it in: ${OUTDIR}"
echo "To push the branch to origin (non-destructive):"
echo "  git -C ${OUTDIR} push origin ${BR_NAME}"
echo
echo "Note: this script creates an ephemeral clone of the bundle under ${OUTDIR}."
echo "If you need to re-run or customize the commit, edit files in that folder and use normal git commands."

