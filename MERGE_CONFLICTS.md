# Merge conflicts inventory

This file lists repository files that currently contain Git merge markers (e.g. `<<<<<<<`) and therefore require manual resolution.

Files found (automatically scanned):

- `.eslintrc.json`
- `frontend/package-lock.json` (multiple conflict regions)
- `frontend/tsconfig.tsbuildinfo`
- `next-app/pages/api/ai/audit-log.ts`
- `next-app/pages/api/ai/ask.ts`
- `next-app/pages/api/ai/[action].ts`
- `next-app/pages/api/ai/dispatch.ts`
- `next-app/components/BotApiKeyManager.tsx`
- `next-app/components/FaucetClaimButton.tsx`
- `frontend/src/hooks/useAI.ts`
- `frontend/src/hooks/useJailTime.ts`
- `frontend/src/hooks/usePiAuth.ts`
- `frontend/src/pages/BotSettings.tsx`
- `frontend/src/pages/boards.tsx`
- `frontend/src/pages/jail.tsx`
- `frontend/src/pages/jail-time.tsx`
- `frontend/src/features/map/usePlayers.ts`

Notes & recommendations:

- These files contain unresolved merge markers and will break TypeScript/Next.js builds and may cause runtime errors. Resolve each conflict by choosing the intended changes and removing the `<<<<<<<`, `=======`, and `>>>>>>>` markers.
- `frontend/package-lock.json` and `frontend/tsconfig.tsbuildinfo` are generated/artifact files; consider regenerating them after resolving source conflicts, or if the lockfile conflicts are not meaningful, prefer regenerating (`npm install`) and committing the resulting lockfile.
- For UI files in `next-app` / `frontend/src`, inspect both sides of the conflict to keep the correct logic and preserve translations/localization if present.
- After resolving, run:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File "scripts/check-code.ps1"
```

to re-run the local verification (node syntax, tsc, mocha).

If you'd like, I can:

- attempt to auto-resolve simple conflicts in generated files (e.g. pick HEAD for `package-lock.json`) — but I won't auto-resolve source code conflicts without your confirmation; or
- open the top 5 conflicted UI files and propose concrete merges for your review.
  Found merge conflict markers in these files (partial list). Review and resolve manually.

- next-app/pages/api/ai/[action].ts
- next-app/pages/api/ai/dispatch.ts
- next-app/pages/api/ai/audit-log.ts
- next-app/pages/api/ai/ask.ts
- next-app/components/FaucetClaimButton.tsx
- next-app/components/BotApiKeyManager.tsx
- frontend/package-lock.json
- frontend/src/hooks/useAI.ts
- frontend/src/pages/boards.tsx
- frontend/src/pages/jail.tsx
- frontend/src/pages/BotSettings.tsx
- frontend/src/pages/jail-time.tsx
- frontend/src/features/map/usePlayers.ts
- frontend/src/components/FaucetClaimButton.tsx
- frontend/src/components/BotApiKeyManager.tsx

Note: There are many more occurrences in the frontend and next-app directories. Use a local grep/IDE search to get the full list.
