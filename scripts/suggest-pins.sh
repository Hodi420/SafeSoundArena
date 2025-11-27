#!/usr/bin/env bash
# Helper: list unique actions pinned to major versions and suggest a manual lookup command using gh (GitHub CLI)
set -euo pipefail

WORKFLOWS_DIR="$(cd "$(dirname "$0")/.." && pwd)/.github/workflows"

echo "Actions pinned only to major versions found in workflows:"
grep -R --line-number -E "uses: .*@v[0-9]+(\s|$)" "$WORKFLOWS_DIR" || true

echo
cat <<'EOF'
To find the latest stable tag for an action, use the GitHub CLI locally (requires gh auth):

# Example to list tags for actions/checkout
gh api repos/actions/checkout/tags --paginate --jq '.[].name' | head -n 10

Replace 'actions/checkout' with the action repo path from the grep output. When you find a tag like 'v4.3.2', update the workflow entry to use that tag instead of '@v4'.
EOF
