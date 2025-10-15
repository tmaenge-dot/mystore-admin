#!/usr/bin/env bash
set -euo pipefail

# install-prompt-telemetry.sh
# Idempotently injects a small telemetry snippet into the mystore-admin
# PROMPT_COMMAND normalization block in ~/.bashrc. If the block doesn't
# exist, the script appends the full snippet (safe & idempotent).

BASHRC="$HOME/.bashrc"
BACKUP="$HOME/.bashrc.mystore.bak.$(date +%s)"

MARK_START="# >>> mystore-admin: safe PROMPT_COMMAND diagnostics & normalization (idempotent)"
MARK_END="# <<< end mystore-admin snippet"
TELEMETRY_MARK="# mystore-admin prompt telemetry (idempotent)"

if [ ! -f "$BASHRC" ]; then
  echo "No $BASHRC found; creating a new one with the snippet."
  touch "$BASHRC"
fi

cp -a "$BASHRC" "$BACKUP"
echo "Backed up $BASHRC to $BACKUP"

if grep -Fq "$TELEMETRY_MARK" "$BASHRC"; then
  echo "Telemetry already present in $BASHRC; nothing to do."
  exit 0
fi

if grep -Fq "$MARK_START" "$BASHRC"; then
  echo "Found mystore-admin block in $BASHRC — inserting telemetry before end marker."
  # Insert telemetry lines before MARK_END
  awk -v start="$MARK_START" -v end="$MARK_END" -v tele="$TELEMETRY_MARK" '
  BEGIN{ins=0}
  {print}
  $0==end{ if(!ins){
    print "  '"tele"'"
    print "  # record current PROMPT_COMMAND type and contents"
    print "  _mst_pc_type=unset"
    print "  if declare -p PROMPT_COMMAND >/dev/null 2>&1; then"
    print "    if declare -p PROMPT_COMMAND 2>/dev/null | grep -q \"declare -[^ ]*a\"; then _mst_pc_type=array; else _mst_pc_type=scalar; fi"
    print "  fi"
    print "  echo \"$(date --iso-8601=seconds) MYSTORE_PROMPT_TELEMETRY TYPE=$_mst_pc_type\" >> /tmp/mystore_prompt_type.log 2>/dev/null || true"
    print "  echo \"--- PROMPT_COMMAND_CONTENT_START ---\" >> /tmp/mystore_prompt_type.log 2>/dev/null || true"
    print "  if [ \"$_mst_pc_type\" = \"array\" ]; then printf '%s\\n' \"${PROMPT_COMMAND[@]:-}\" >> /tmp/mystore_prompt_type.log 2>/dev/null || true; else printf '%s\\n' \"${PROMPT_COMMAND-}\" >> /tmp/mystore_prompt_type.log 2>/dev/null || true; fi"
    print "  echo \"--- PROMPT_COMMAND_CONTENT_END ---\" >> /tmp/mystore_prompt_type.log 2>/dev/null || true"
    ins=1
  }}
' "$BASHRC" > "$BASHRC.tmp" && mv "$BASHRC.tmp" "$BASHRC"

  echo "Telemetry injected into existing block."
  exit 0
fi

echo "mystore-admin block not found; appending full snippet with telemetry to $BASHRC"
cat >> "$BASHRC" <<'EOF'
# >>> mystore-admin: safe PROMPT_COMMAND diagnostics & normalization (idempotent)
if [[ -n "$PS1" && -z "${MYSTORE_PROMPT_NORMALIZED:-}" ]]; then
  export MYSTORE_PROMPT_NORMALIZED=1
  # If present, source the workspace diagnostic helper (no-op if missing)
  if [[ -f "$HOME/mystore/mystore-admin/scripts/diagnose-bash-startup.sh" ]]; then
    # shellcheck disable=SC1090
    . "$HOME/mystore/mystore-admin/scripts/diagnose-bash-startup.sh"
  fi
  # Normalize PROMPT_COMMAND: convert scalar to array if necessary.
  if declare -p PROMPT_COMMAND 2>/dev/null | grep -q 'declare -[^ ]*a'; then
    : # already an array
  else
    _mystore_old_pc="${PROMPT_COMMAND-}"
    PROMPT_COMMAND=()
    if [[ -n "$_mystore_old_pc" ]]; then
      PROMPT_COMMAND+=("$_mystore_old_pc")
      unset _mystore_old_pc
    fi
  fi
  # mystore-admin prompt telemetry (idempotent)
  _mst_pc_type=unset
  if declare -p PROMPT_COMMAND >/dev/null 2>&1; then
    if declare -p PROMPT_COMMAND 2>/dev/null | grep -q "declare -[^ ]*a"; then _mst_pc_type=array; else _mst_pc_type=scalar; fi
  fi
  echo "$(date --iso-8601=seconds) MYSTORE_PROMPT_TELEMETRY TYPE=$_mst_pc_type" >> /tmp/mystore_prompt_type.log 2>/dev/null || true
  echo "--- PROMPT_COMMAND_CONTENT_START ---" >> /tmp/mystore_prompt_type.log 2>/dev/null || true
  if [ "$_mst_pc_type" = "array" ]; then printf '%s\n' "${PROMPT_COMMAND[@]:-}" >> /tmp/mystore_prompt_type.log 2>/dev/null || true; else printf '%s\n' "${PROMPT_COMMAND-}" >> /tmp/mystore_prompt_type.log 2>/dev/null || true; fi
  echo "--- PROMPT_COMMAND_CONTENT_END ---" >> /tmp/mystore_prompt_type.log 2>/dev/null || true
fi
# <<< end mystore-admin snippet
EOF

echo "Appended snippet to $BASHRC"
echo "Done. Please open a new integrated terminal to let the snippet run; check /tmp/mystore_prompt_type.log for telemetry." 

exit 0
