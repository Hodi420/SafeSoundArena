#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
WORKFLOWS_DIR="$ROOT_DIR/.github/workflows"

echo "Scanning $WORKFLOWS_DIR for unsafe action refs and loose pins..."

# Find unsafe refs (master/main/HEAD/latest/refs/)
unsafe=$(grep -R --line-number -E "uses: .*@(master|main|HEAD|latest|refs/)" "$WORKFLOWS_DIR" || true)
if [ -n "$unsafe" ]; then
  echo "ERROR: Found unsafe action refs (master/main/HEAD/latest/refs):"
  echo "$unsafe"
  exit 2
fi

# Find major-only pins like @v4 or @v2
majors=$(grep -R --line-number -E "uses: .*@v[0-9]+(\s|$)" "$WORKFLOWS_DIR" || true)
if [ -n "$majors" ]; then
  echo "ERROR: Found actions pinned only to a major version (e.g. @v4). Pin to a full tag or commit SHA. The check will fail until fixed:";
  echo "$majors";
  exit 4
else
  echo "No major-only pins found."
fi

echo "Workflow scan complete."
