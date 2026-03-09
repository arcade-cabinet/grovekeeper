#!/usr/bin/env bash
# PostToolUse hook (Edit|Write): block Math.random() in game code
# Non-blocking -- outputs warnings only (always exits 0)
set -uo pipefail

INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)
if [ -z "$FILE" ] || [ ! -f "$FILE" ]; then
  exit 0
fi

# Only check game source files
case "$FILE" in
  */game/*.ts|*/game/*.tsx|*/components/*.ts|*/components/*.tsx) ;;
  *) exit 0 ;;
esac

# Skip test files (Math.random in mocks is acceptable)
case "$FILE" in
  *.test.ts|*.test.tsx) exit 0 ;;
esac

FOUND=$(grep -n 'Math\.random()' "$FILE" 2>/dev/null)
if [ -n "$FOUND" ]; then
  echo ""
  echo "[WARN] no-math-random: Math.random() found in $FILE"
  echo "$FOUND"
  echo ""
  echo "ALL randomness MUST use seeded RNG (scopedRNG from game/utils/seedWords.ts)."
  echo "Math.random() breaks deterministic replay and seed-based world generation."
  echo ""
fi

exit 0
