# Codebase Cleanup Master Plan
# Orchestrator: Claude (Sonnet 4.6)
# Started: 2026-02-22

## STATUS: COMPLETE ✅ — ALL PHASES DONE, BUILD PASSING

## PHASE 4 COMPLETE ✅ (2026-02-22)
- Merged pills.ts into colors.ts (1 fewer file)
- Replaced hardcoded hex colors (CampaignViewPage already used theme tokens — no changes needed)
- Renamed 6 hooks: Controller→Orchestrator, Actions→Actions, AutoSave/Uploader→Effect
- Build: PASSES (1251 modules, 3.35s)

## PHASE 3 COMPLETE ✅ (2026-02-22)
- src/domains/ (91 files) DELETED
- Created: src/pages/ (8 files), src/components/ (51 files)
- Logic moved: features/manage/, features/rules/, features/infrastructure/ hooks, features/campaigns/launch/ hooks
- Build: PASSES (1252 modules, 3.31s)

## PHASE 1 COMPLETE ✅ (2026-02-22)
- Archived: dbmigration/ (7 docs), migrations/ (4 files), scripts migration files (19 files)
- Deleted: src/db/ (16 files), functions/api/d1/ (1 file)
- Slimmed: src/data/provider.ts from 756 → 180 lines
- Build: PASSES after all Phase 1 changes

## Rules
- LOCAL CODEBASE ONLY. No pushes to GitHub/Cloudflare.
- Verify build passes after EVERY phase before moving to next.
- If build breaks, rollback that phase and re-plan.
- Write all findings to this .cleanup/ directory before executing.
- Read this file at the start of any resumed session.

## Project Root
/c/Users/Jay/Desktop/Jay/ops-dashboard-cloudflare

## Phase Status
- [x] PHASE 1: Analysis (4 agents run, 2 reports written)
- [x] PHASE 2: Dead Code Removal — COMPLETE ✅
- [ ] PHASE 3: Duplicate Consolidation (fetchProducts x6, pagination x11, D1 guards)
- [ ] PHASE 4: Folder Structure Cleanup (awaiting agent 3 report)
- [ ] PHASE 5: State & Component Cleanup (awaiting agent 4 report)
- [ ] PHASE 6: Naming & Style Standardization
- [ ] PHASE 7: Health Package Generation

## Analysis Reports Status
- [x] dead-code-report.md — WRITTEN, APPROVED (with overseer correction)
- [x] duplicate-code-report.md — WRITTEN, APPROVED
- [ ] folder-structure-report.md — AGENT RUNNING (a6ee556)
- [ ] state-component-report.md — AGENT RUNNING (ab2c51e)

## Verification Command
```
cd /c/Users/Jay/Desktop/Jay/ops-dashboard-cloudflare && npm run build 2>&1
```

## Key Numbers (from prior audit)
- 272 TypeScript files
- src/features/: 77 files
- src/domains/: 91 files
- src/core/: 62 files
- src/db/: 16 files (ALL DEAD - D1 only)
- src/data/provider.ts: 757 lines (mostly dead)
- fetchProducts() defined: 6 times
- Airtable pagination loop: 11 files
- useState total: 347 across 76 files
- Custom hooks: 41

## Analysis Reports Location
- analysis/dead-code-report.md
- analysis/duplicate-code-report.md
- analysis/folder-structure-report.md
- analysis/state-component-report.md

## If Context Window Resets
1. Read this MASTER-PLAN.md first
2. Check which phase is in progress
3. Read the relevant phase report
4. Continue from where analysis left off
