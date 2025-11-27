#!/usr/bin/env bash
set -euo pipefail

MISSING=0
for name in GITHUB_TOKEN DOCKERHUB_USERNAME DOCKERHUB_TOKEN AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY; do
  if [ -z "${!name:-}" ]; then
    echo "Missing required secret: $name"
    MISSING=1
  fi
done

if [ $MISSING -eq 1 ]; then
  echo "One or more critical secrets are missing. Set them before deploying."
  exit 3
fi

echo "All critical secrets appear present."
