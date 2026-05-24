# Merge Conflict Resolution Guide

## 📊 Conflict Summary

- **Total files with conflicts:** 29 files
- **All conflicts located in:** `frontend/src/` directory
- **Total conflict blocks:** 51 blocks
- **Merge source:** Commit `9841034` (Initial full project commit)

---

## 🚨 High Priority Files (Multiple Conflicts)

These files have 3-4 conflict blocks and should be resolved first:

1. **frontend/src/components/GameWorld.tsx** (4 blocks)
2. **frontend/src/components/Marketplace.tsx** (4 blocks)
3. **frontend/src/pages/boards.tsx** (4 blocks)
4. **frontend/src/pages/jail-time.tsx** (4 blocks)
5. **frontend/src/pages/jail.tsx** (3 blocks)

---

## 📋 Complete File List

### Components (17 files)
- [ ] `frontend/src/client.ts` (1 block)
- [ ] `frontend/src/components/BotApiKeyManager.tsx` (1 block)
- [ ] `frontend/src/components/ChallengeTracker.tsx` (1 block)
- [ ] `frontend/src/components/FactionSelector.tsx` (1 block)
- [ ] `frontend/src/components/FaucetClaimButton.tsx` (1 block)
- [ ] `frontend/src/components/GameWorld.tsx` (4 blocks) ⚠️
- [ ] `frontend/src/components/GuildPanel.tsx` (2 blocks)
- [ ] `frontend/src/components/IconButton.tsx` (2 blocks)
- [ ] `frontend/src/components/MainNav.tsx` (2 blocks)
- [ ] `frontend/src/components/Marketplace.tsx` (4 blocks) ⚠️
- [ ] `frontend/src/components/ReputationBar.tsx` (1 block)
- [ ] `frontend/src/components/SitesBoardTable.tsx` (1 block)
- [ ] `frontend/src/components/Toast.tsx` (2 blocks)
- [ ] `frontend/src/components/UserBoardTable.tsx` (1 block)

### Hooks & Features (7 files)
- [ ] `frontend/src/features/map/usePlayers.ts` (1 block)
- [ ] `frontend/src/hooks/useAI.ts` (1 block)
- [ ] `frontend/src/hooks/useJailTime.ts` (1 block)
- [ ] `frontend/src/hooks/useMiniGames.ts` (2 blocks)
- [ ] `frontend/src/hooks/usePiAuth.ts` (2 blocks)

### Pages (5 files)
- [ ] `frontend/src/pages/boards.tsx` (4 blocks) ⚠️
- [ ] `frontend/src/pages/BotSettings.tsx` (1 block)
- [ ] `frontend/src/pages/jail.tsx` (3 blocks) ⚠️
- [ ] `frontend/src/pages/jail-time.tsx` (4 blocks) ⚠️
- [ ] `frontend/src/pages/no-transition-demo.tsx` (1 block)
- [ ] `frontend/src/pages/_app.tsx` (2 blocks)

### Services & Utils (3 files)
- [ ] `frontend/src/services/api/client.ts` (1 block)
- [ ] `frontend/src/types/api.ts` (1 block)
- [ ] `frontend/src/utils/eventLogger.ts` (1 block)
- [ ] `frontend/src/utils/requirePioneer.ts` (1 block)

---

## 🔧 How to Resolve Conflicts

### Option 1: VS Code (Recommended)
1. Open the conflicted file in VS Code
2. Click "Accept Current Change", "Accept Incoming Change", or "Accept Both Changes"
3. Review the merged result
4. Save the file

### Option 2: Command Line
```bash
# View the conflict
git diff frontend/src/components/GameWorld.tsx

# Manually edit the file and remove the opening, divider, and closing conflict markers.

# After editing, stage the file
git add frontend/src/components/GameWorld.tsx
```

### Option 3: Use `git mergetool`
```bash
git mergetool
# This opens your configured merge tool (vimdiff, Beyond Compare, etc.)
```

---

## ✅ Conflict Resolution Checklist

### Phase 1: High Priority (Do First)
- [ ] **frontend/src/components/GameWorld.tsx** - Review 4 blocks, keep both changes if compatible
- [ ] **frontend/src/components/Marketplace.tsx** - Review 4 blocks
- [ ] **frontend/src/pages/boards.tsx** - Review 4 blocks
- [ ] **frontend/src/pages/jail-time.tsx** - Review 4 blocks
- [ ] **frontend/src/pages/jail.tsx** - Review 3 blocks

### Phase 2: Medium Priority
- [ ] **frontend/src/components/GuildPanel.tsx** (2 blocks)
- [ ] **frontend/src/components/IconButton.tsx** (2 blocks)
- [ ] **frontend/src/components/MainNav.tsx** (2 blocks)
- [ ] **frontend/src/components/Toast.tsx** (2 blocks)
- [ ] **frontend/src/hooks/useMiniGames.ts** (2 blocks)
- [ ] **frontend/src/hooks/usePiAuth.ts** (2 blocks)
- [ ] **frontend/src/pages/_app.tsx** (2 blocks)

### Phase 3: Low Priority (Single Blocks)
- [ ] All remaining files with 1 conflict block each

---

## 📝 After Resolving Conflicts

1. **Verify the build compiles:**
   ```bash
   npm run lint
   npm run build
   npm run test
   ```

2. **Commit the resolved conflicts:**
   ```bash
   git add .
   git commit -m "refactor: resolve merge conflicts in frontend components and pages"
   ```

3. **Push to main:**
   ```bash
   git push origin main
   ```

---

## 🎯 Strategy for Resolution

- **Keep both changes** if they modify different parts of the file
- **Choose one change** if they conflict on the same logic
- **Combine changes** intelligently if both improve the code
- **When unsure**, test both versions and see what works best

---

## 📞 Need Help?

If a conflict is too complex:
1. Look at the git log to understand why the conflict exists
2. Review both branches to understand the intent
3. Discuss with team members if needed
4. Test after resolution to ensure functionality

---

**Last Updated:** 2026-05-15
**Merge Source:** 9841034
