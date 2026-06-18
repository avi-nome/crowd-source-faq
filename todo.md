# v1.69 Multi-Program — Post-Merge Todo

**Status:** v1.69 SHIPPED on `main` via PR #65 (merge commit `6472355`). 46 commits, all 12 phases, every architectural follow-up closed.

This file lists what's still on the table so the work isn't lost.

---

## Genuine Outstanding Work

### 1. Smoke-test the migration script (priority)
The new `backend/scripts/migrate-batch-backfill.ts` has 5 phases (14 collections + ProgramSettings + AiConfig + FeatureFlag + ProgramReputation + ProgramEnrollment + enrollmentMode) but has not actually been run against the live MongoDB.

**Steps:**
```bash
# 1. kill any orphan tsx blocking port 6767
pkill -f 'tsx.*server'

# 2. run the migration against cluster0.lrnnrce
npx tsx scripts/migrate-batch-backfill.ts

# 3. spot-check the 3 new collections
#    - Batch: every batch has status='active' + enrollmentMode='open'
#    - ProgramEnrollment: every user is enrolled in the default program
#    - ProgramReputation: every user has a per-program rep record
#      with points/sp/tier/acceptedAnswers seeded from User
```

**Expected counts (for the 130-FAQ seed environment):**
- `ProgramSettings`: 1 (the default program)
- `ProgramEnrollment`: ~admin count + user count
- `ProgramReputation`: same as enrollment count
- `AiConfig.batchId: null` documents: 1 (global default)
- `FeatureFlag.batchId: null` documents: ~5 (one per known flag)

### 2. Run `npm run seed` to verify
The seed was patched in Phase 1 to write `Batch` rows + `ProgramSettings`. Run it against a fresh DB and confirm it doesn't break:
```bash
npm run seed
```
Verify:
- A default batch gets created (idempotent — no duplicates on re-run)
- `ProgramSettings` gets bootstrapped with sensible defaults
- FAQs have `batchId` tagged to the default program

### 3. End-to-end smoke test of the per-program flows
From the PR body — walk through:
- `/` renders HomePage (search + popular/recent FAQs + categories + top solved + trending + FromMeetings), no program picker
- `/admin/programs` renders the Hub
- Create a per-program AI override via `/admin/ai/config?batchId=...`
- Connect a per-program Zoom app via `/admin/programs/:id/zoom`
- Connect a per-program Discord bot via `/admin/programs/:id/discord`
- Verify the bot's `/ask` and `/search` hit the right program's data (curl from the same network as the bot, with `?batchId=...`)

### 4. Re-verify tsc on both workspaces
LSP sometimes shows stale errors after the merge. Re-run:
```bash
cd backend && npx tsc --noEmit
cd ../frontend && npx tsc --noEmit
```
Both should be 0.

---

## Optional / Nice-to-have (deferred)

### 5. Retire `BatchContext.tsx` shim (v1.70 follow-up)
Every consumer still imports from the old path. Once v1.70 ships:
- Delete `frontend/src/context/BatchContext.tsx`
- Sweep all `from '../context/BatchContext'` imports → `from '../context/ProgramContext'`
- One commit, mechanical

### 6. Hide `BatchSwitcher` on public pages
Currently `BatchSwitcher` is gated by `showProgramSwitcher` which defaults to `false` and is only enabled on `ProgramPage` (the dedicated per-program detail view). The remaining 30+ user-facing pages already don't show the switcher. Consider hiding it entirely on public pages so users have zero way to switch (admins only via Programs Hub). Low priority — the current state is correct.

### 7. Integration test for per-program Discord bot command dispatch
The 8 commands in `backend/bot/commands/*.ts` all accept `(interaction, config, batchId)` and thread `batchId` through `buildBotApiUrl` / `botApiHeaders`. Worth a test that:
- Mocks the discord.js interaction
- Asserts the right URL is built (with vs without `?batchId=...`)
- Covers all 8 commands

### 8. File rename follow-ups
- `BatchContext.tsx` → `ProgramContext.tsx` (deferred to v1.70; the additive shim works today)
- Old `deprecated/HomePage.tsx` and `BatchPortalPage.tsx` vs the new `HomePage.tsx` — verify the deprecation folder can be deleted entirely

---

## What NOT To Do

- **Do not push to `MCSFAQ/main`.** The production branch is `main` on `github.com/vicharanashala/crowd-source-faq`. `MCSFAQ/main` is a separate, older branch.
- **Do not force-push `main`.** The v1.69 merge was a regular merge commit (`6472355`); force-pushing would break the SHA chain for any downstream clones.
- **Do not skip the migration script.** The new collections (ProgramSettings, ProgramEnrollment, ProgramReputation, per-bucket AiConfig/FeatureFlag) need to exist for the admin UI widgets to work end-to-end.

---

## Reference

- **PR #65**: https://github.com/vicharanashala/crowd-source-faq/pull/65
- **Merge commit on main**: `6472355`
- **Feature branch** (now deleted from remote): `v1.69-multi-program-merge`
- **Design doc**: `context/multi-program-cms-design.md`
- **Plan**: `plan_exec.md`
- **Status**: `git log --oneline origin/main -50` to see the 46 phase-commits
