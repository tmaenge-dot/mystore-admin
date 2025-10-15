#!/usr/bin/env bash
# diagnose-bash-startup.sh
# Safe diagnostic script to be sourced from a bash startup file.
# Logs which files are being sourced, basic env, and errors to /tmp/bash_startup_diag.log
# It is safe to be sourced (uses return) and will not exit the parent shell.

LOG=${DIAG_LOG:-/tmp/bash_startup_diag.log}
TS() { date --iso-8601=seconds 2>/dev/null || date '+%Y-%m-%dT%H:%M:%S%z'; }

echo "\n=== DIAG $(${TS}) PID=$$ SHELL=${SHELL:-unknown} ===" >> "$LOG"
echo "PWD=$PWD" >> "$LOG"
echo "USER=$USER HOME=$HOME SHELL=$SHELL" >> "$LOG"
echo "FLAGS=$-" >> "$LOG"
echo "BASH_ENV=${BASH_ENV:-}" >> "$LOG"
echo "PROMPT_COMMAND=${PROMPT_COMMAND:-}" >> "$LOG"

# Record PROMPT_COMMAND observed form (array vs scalar) and its contents
PC_TYPE="unset"
PC_CONTENT=""
if declare -p PROMPT_COMMAND >/dev/null 2>&1; then
  # If declare -p contains an 'a' flag it's an array
  if declare -p PROMPT_COMMAND 2>/dev/null | grep -q 'declare -[^ ]*a'; then
    PC_TYPE="array"
    # Expand array elements safely
    PC_CONTENT=$(printf '%s\n' "${PROMPT_COMMAND[@]:-}")
  else
    PC_TYPE="scalar"
    PC_CONTENT="${PROMPT_COMMAND-}"
  fi
fi

echo "PROMPT_COMMAND_TYPE=$PC_TYPE" >> "$LOG"
# Also write a concise timestamped record to a separate file for quick inspection
echo "$(${TS}) PROMPT_COMMAND_TYPE=$PC_TYPE" >> /tmp/mystore_prompt_type.log 2>/dev/null || true
echo "--- PROMPT_COMMAND_CONTENT_START ---" >> /tmp/mystore_prompt_type.log 2>/dev/null || true
printf '%s\n' "$PC_CONTENT" >> /tmp/mystore_prompt_type.log 2>/dev/null || true
echo "--- PROMPT_COMMAND_CONTENT_END ---" >> /tmp/mystore_prompt_type.log 2>/dev/null || true

echo "BASH_SOURCE_LIST: ${BASH_SOURCE[*]:-}" >> "$LOG"
echo "BASH_LINENO: ${BASH_LINENO[*]:-}" >> "$LOG"

for i in "${!BASH_SOURCE[@]}"; do
  src="${BASH_SOURCE[$i]}"
  lineno="${BASH_LINENO[$i]:-?}"
  echo "SRC[$i]=$src LINENO=$lineno" >> "$LOG"
  if [ -f "$src" ]; then
    echo "---- head of $src (first 120 lines) ----" >> "$LOG"
    sed -n '1,120p' "$src" >> "$LOG" 2>/dev/null || true
    echo "---- end head ----" >> "$LOG"
  else
    echo "(file not readable: $src)" >> "$LOG"
  fi
done

# Trap ERR to log where failures happen
trap 'ec=$?; echo "ERR rc=$ec at ${BASH_SOURCE[0]}:${LINENO} (caller:${FUNCNAME[*]})" >> "$LOG"; echo "STACK BASH_LINENO=${BASH_LINENO[*]}" >> "$LOG"' ERR

# If executed directly, just exit 0
if [ "${BASH_SOURCE[0]}" = "$0" ]; then
  echo "(diagnostic executed directly)" >> "$LOG"
  exit 0
fi

echo "(diagnostic sourced successfully)" >> "$LOG"
# return to avoid killing the parent shell
return 0 2>/dev/null || exit 0
