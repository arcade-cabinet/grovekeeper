#!/usr/bin/env bash
# PreToolUse hook (Bash): quality gate before git commit commands
# Runs pnpm lint + tsc --noEmit only when the Bash command is a git commit
set -euo pipefail

# Read event JSON from stdin
INPUT=$(cat)

# Extract the bash command from tool_input
CMD=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)
if [ -z "$CMD" ]; then
  exit 0
fi

# Only gate git commit commands
case "$CMD" in
  *"git commit"*)
    echo "Running pre-commit quality checks..."
    pnpm lint 2>&1 || { echo "Lint failed -- commit blocked"; exit 2; }
    pnpm tsc 2>&1 || { echo "TypeScript check failed -- commit blocked"; exit 2; }
    pnpm test 2>&1 || { echo "Tests failed -- commit blocked"; exit 2; }
    echo "Pre-commit checks passed"
    ;;
esac

exit 0
