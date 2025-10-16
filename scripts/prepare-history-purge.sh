#!/usr/bin/env bash
set -euo pipefail
# prepare-history-purge.sh [--run]
# This helper shows the git-filter-repo command and optionally runs it.
RUN_FLAG=0
if [[ ${1:-} == "--run" ]]; then
  RUN_FLAG=1
fi

# Files/paths to remove from history
REMOVE_PATHS=("data_store" "logs" "server.output.log" "server.pid")

echo "Planned removal paths: ${REMOVE_PATHS[*]}"

CMD=(git filter-repo)
for p in "${REMOVE_PATHS[@]}"; do
  CMD+=(--invert-paths --path "$p")
done

echo "Dry-run: the following command would be executed inside a mirror clone:" 
printf '%s ' "${CMD[@]}"
echo

echo "Recommended safe steps:"
echo "  1) git clone --mirror <repo-url> repo-filter.git"
echo "  2) cd repo-filter.git"
echo "  3) ${CMD[*]}"
echo "  4) verify and then force-push: git push --force --all && git push --force --tags"

if [[ $RUN_FLAG -eq 1 ]]; then
  echo "--run specified. This will execute the command in the current repo (NOT recommended)."
  read -p "Are you SURE you want to run filter-repo here? This rewrites history. [y/N] " yn
  if [[ "${yn,,}" == "y" ]]; then
    git filter-repo "${CMD[@]:1}"
  else
    echo "Aborted."
  fi
fi
