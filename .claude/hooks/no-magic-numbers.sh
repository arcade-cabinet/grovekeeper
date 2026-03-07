#!/usr/bin/env bash
# PostToolUse hook (Edit|Write): detect hardcoded tuning values that should be in config JSON
# Non-blocking -- outputs warnings only (always exits 0)
set -uo pipefail

INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)
if [ -z "$FILE" ] || [ ! -f "$FILE" ]; then
  exit 0
fi

# Only check game TypeScript files (not config, not tests)
case "$FILE" in
  */game/*.ts|*/game/*.tsx|*/components/*.ts|*/components/*.tsx)
    case "$FILE" in
      *.test.ts|*.test.tsx|*/config/*) exit 0 ;;
    esac
    ;;
  *) exit 0 ;;
esac

WARNINGS=0

# Detect inline const declarations that look like tuning values
# Pattern: const UPPER_CASE = <number> where number is not 0 or 1
FOUND=$(grep -nE '^\s*const\s+[A-Z][A-Z_0-9]+\s*=\s*[0-9]+(\.[0-9]+)?\s*;' "$FILE" 2>/dev/null | \
  grep -vE '=\s*[01]\s*;|=\s*0\.[0-9]+\s*;' | head -5)

if [ -n "$FOUND" ]; then
  echo "[WARN] no-magic-numbers: Tuning constants found inline in $FILE"
  echo "$FOUND"
  echo ""
  echo "Consider moving these to config/game/*.json so they're discoverable"
  echo "and can be tuned without code changes."
  WARNINGS=$((WARNINGS + 1))
fi

if [ "$WARNINGS" -gt 0 ]; then
  echo ""
  echo "no-magic-numbers: $WARNINGS warning(s) -- not blocking."
fi

exit 0
