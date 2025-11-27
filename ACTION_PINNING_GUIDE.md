Action pinning guide

- Why pin: Using major-only pins (e.g. @v4) is convenient but can silently follow breaking changes. Prefer explicit tags (e.g. @v4.3.2) or commit SHAs.
- How to pick a tag locally:
  1. Install GitHub CLI and authenticate: `gh auth login`.
  2. Query tags: `gh api repos/<owner>/<repo>/tags --paginate --jq '.[].name' | head -n 20`.
  3. Pick the latest semver stable tag (avoid -rc or -beta tags).
  4. Update the workflow and open a PR.

- Quick helper scripts in `scripts/`:
  - `check-workflows.sh` — enforces no unsafe refs and no major-only pins (used by CI hygiene).
  - `suggest-pins.sh` — lists locations that need pinning and suggests `gh` queries.

- Recommended next steps:
  - Run `bash scripts/suggest-pins.sh` locally to list candidates.
  - For each candidate, inspect the action's repo and pin to the latest stable tag.
  - Run `bash scripts/check-workflows.sh` to validate.
