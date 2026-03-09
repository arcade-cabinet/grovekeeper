#!/usr/bin/env bash
# PostToolUse hook (Edit|Write): warn when a file exceeds 300 lines
# Non-blocking -- outputs warnings only (always exits 0)
set -uo pipefail

INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)
if [ -z "$FILE" ] || [ ! -f "$FILE" ]; then
  exit 0
fi

# Only check TypeScript source files
case "$FILE" in
  *.ts|*.tsx) ;;
  *) exit 0 ;;
esac

# Skip test files, config, and generated files
case "$FILE" in
  *.test.ts|*.test.tsx|*/node_modules/*|*/config/*) exit 0 ;;
esac

LINES=$(wc -l < "$FILE" 2>/dev/null | tr -d ' ')
if [ "$LINES" -gt 300 ]; then
  echo ""
  echo "[WARN] file-size-sentinel: $FILE is $LINES lines (limit: 300)"
  echo "       Files over 300 lines should be decomposed into a subpackage."
  echo "       Create a directory with focused modules and an index.ts barrel export."
  echo ""
fi

exit 0
