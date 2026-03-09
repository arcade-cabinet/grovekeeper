#!/usr/bin/env bash
# PostToolUse hook (Edit|Write): warn when creating/modifying game system files
# without a corresponding section in GAME_SPEC.md
# Non-blocking -- outputs warnings only (always exits 0)
set -uo pipefail

INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)
if [ -z "$FILE" ] || [ ! -f "$FILE" ]; then
  exit 0
fi

# Only check game system files (not config, not tests, not UI)
case "$FILE" in
  */game/systems/*.ts|*/game/hooks/*.ts|*/game/actions/*.ts|*/game/input/*.ts)
    # Skip test files
    case "$FILE" in
      *.test.ts|*.test.tsx) exit 0 ;;
    esac
    ;;
  *) exit 0 ;;
esac

# Extract the base filename without extension
BASENAME=$(basename "$FILE" .ts)

# Check if GAME_SPEC.md mentions this system
SPEC_FILE="docs/GAME_SPEC.md"
if [ -f "$SPEC_FILE" ]; then
  if ! grep -qi "$BASENAME" "$SPEC_FILE" 2>/dev/null; then
    echo ""
    echo "[WARN] spec-coverage: '$BASENAME' is not mentioned in docs/GAME_SPEC.md"
    echo "       DOCS-FIRST RULE: Before writing or modifying a game system,"
    echo "       add or update its section in GAME_SPEC.md."
    echo "       The spec defines the game. Tests verify the spec. Code implements the spec."
    echo ""
  fi
fi

exit 0
