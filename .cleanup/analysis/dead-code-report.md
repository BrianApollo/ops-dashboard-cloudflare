# Dead Code Analysis Report
# Generated: 2026-02-22 | Agent: a28a66e
# OVERSEER CORRECTION APPLIED: Agent assumed VITE_DATA_PROVIDER=d1.
# ACTUAL env: VITE_DATA_PROVIDER=airtable. Dead/live verdicts below are corrected.

---

## OVERSEER NOTES
The analysis agent incorrectly assumed the app is running on D1. We reverted to Airtable in
the previous session. Corrections applied:
- D1 implementations in provider.ts are DEAD (not the Airtable ones)
- The entire src/db/ directory is DEAD (D1 only)
- migrations/, functions/api/d1/, dbmigration/ are all DEAD
- airtableProducts and airtableUsers in provider.ts are ALIVE (still called by feature data.ts files)
- airtableScripts and airtableVideos stubs are DEAD (we bypassed them in the last session)

---

## CATEGORY 1: SAFE TO DELETE — Zero References in Airtable Mode

### src/db/ (entire directory — 16 files)
All D1 database query code. Nothing in the active Airtable code path imports these.

| File | Verdict |
|------|---------|
| src/db/client.ts | DELETE — D1 client, only imported by functions/api/d1/ |
| src/db/schema.ts | DELETE — Drizzle schema, not used in Airtable mode |
| src/db/queries/adAccounts.ts | DELETE — D1 query, 0 imports outside d1 endpoint |
| src/db/queries/adPresets.ts | DELETE — D1 query |
| src/db/queries/advertorials.ts | DELETE — D1 query |
| src/db/queries/businessManagers.ts | DELETE — D1 query |
| src/db/queries/campaigns.ts | DELETE — D1 query |
| src/db/queries/images.ts | DELETE — D1 query |
| src/db/queries/pages.ts | DELETE — D1 query |
| src/db/queries/pixels.ts | DELETE — D1 query |
| src/db/queries/products.ts | DELETE — D1 query |
| src/db/queries/profiles.ts | DELETE — D1 query |
| src/db/queries/scalingRules.ts | DELETE — D1 query |
| src/db/queries/scripts.ts | DELETE — D1 query |
| src/db/queries/users.ts | DELETE — D1 query |
| src/db/queries/videos.ts | DELETE — D1 query |

**Risk: VERY LOW** — None of these are imported by the Airtable code path.

### migrations/ (entire directory)
Drizzle D1 migration SQL files. Dead in Airtable mode.
- migrations/0000_cultured_sleepwalker.sql — DELETE
- migrations/seed-test-data.sql — DELETE
- migrations/meta/ — DELETE

**Risk: VERY LOW** — Pure SQL files, not imported by any TS code.

### dbmigration/ (entire directory — 7 planning docs)
D1 migration planning documents. Historical reference only.
- dbmigration/00-master-plan.md through 06-verification-notes.md
**Verdict: ARCHIVE to .cleanup/archived/dbmigration/**

### scripts/ (migration-related files only)
| File | Verdict |
|------|---------|
| scripts/migrate-to-d1.mjs | ARCHIVE — one-time migration script |
| scripts/migration.sql | ARCHIVE — ~2MB SQL data dump |
| scripts/migration-part1.sql through part7.sql | ARCHIVE |
| scripts/test-live.mjs | ARCHIVE — D1 test script |
| scripts/test-*.sql (8 files) | ARCHIVE |
| scripts/audit-sync.mjs | KEEP — potentially useful audit tool |

**Keep audit-sync.mjs** (it was already modified in last session to use env var for API key).

---

## CATEGORY 2: PARTIALLY DEAD — src/data/provider.ts (757 lines → ~200 lines)

### What to DELETE from provider.ts

**D1 implementations (ALL dead in Airtable mode):**
- d1Products and all its helper functions (mapD1Product, normalizeProductStatus, etc.)
- d1Users and helpers
- d1Scripts and helpers
- d1Videos and helpers
- d1Campaigns and helpers
- d1Images and helpers
- d1AdPresets and helpers
- d1Advertorials and helpers
- The VITE_DATA_PROVIDER switch logic
- The import of src/db/client.ts

**Airtable stubs that are now bypassed (also dead):**
- airtableScripts — returns [], bypassed in last session (scripts/data.ts calls airtableFetch directly)
- airtableVideos — returns [], bypassed in last session (videos/data.ts calls airtableFetch directly)

### What to KEEP in provider.ts

**Airtable implementations that ARE still called:**
- airtableProducts — still imported by feature data.ts files via provider.products.getAll()
- airtableUsers — still imported by scripts/data.ts via provider.users.getAll()
- getEditors() — still called by videos/data.ts via provider.users.getEditors()
- The exported `provider` object (but simplified to Airtable-only, no switch)

**After cleanup, provider.ts goes from 757 lines → ~100-150 lines.**

The cleanest approach: after Phase 2 (duplicate consolidation), provider.ts
may become unnecessary entirely. products and users fetching should move to
reference-data.ts, and provider.ts can be deleted.

---

## CATEGORY 3: CONFIRMED ALIVE — Do NOT Touch

### src/domains/manage/ (7 files)
ROUTED at /ops/manage. Uses Facebook Graph API directly. KEEP ALL.

### src/domains/ops/rules/ (4 files)
ROUTED at /ops/rules. Still uses Airtable via data.ts. KEEP ALL.

### functions/api/ (except d1/)
- functions/api/airtable/ — ACTIVE proxy for all Airtable calls
- functions/api/auth/ — ACTIVE JWT auth
- functions/api/cloudflare/ — ACTIVE image upload
- functions/api/facebook/ — ACTIVE Facebook API proxy
- functions/api/redtrack/ — ACTIVE Redtrack proxy

### functions/api/d1/
- functions/api/d1/[[path]].ts — DEAD in Airtable mode (D1 endpoint, not called)
- **VERDICT: DELETE**

---

## CATEGORY 4: UNCERTAIN — Needs Human Review

### src/_unbound/
- ForbiddenPage.tsx — 403 error page, not found in routes.tsx
- May be used by AuthGuard error boundary
- **VERDICT: Search for usage before deleting. If 0 references → DELETE**

---

## EXECUTION PLAN

### Step 1: Archive migration artifacts (5 min, zero risk)
```
Move to .cleanup/archived/:
  - dbmigration/ (7 docs)
  - scripts/migrate-to-d1.mjs
  - scripts/migration*.sql
  - scripts/test-*.sql
  - migrations/ (SQL files)
```

### Step 2: Delete src/db/ entire directory (5 min, low risk)
Verify first: `grep -r "from.*src/db" src/ --include="*.ts" --include="*.tsx"`
If zero results → safe to delete entire directory.

### Step 3: Delete functions/api/d1/ (2 min, low risk)
Verify first: check it's not referenced in wrangler.toml routing.

### Step 4: Slim provider.ts (30 min, medium risk)
- Remove all D1 implementations
- Remove airtableScripts stub (dead)
- Remove airtableVideos stub (dead)
- Remove VITE_DATA_PROVIDER switch — hardcode Airtable
- Keep airtableProducts, airtableUsers, getEditors
- Verify build passes after

### Step 5: Resolve _unbound (5 min, very low risk)
Search for usage, delete if 0 references.

---

## ESTIMATED IMPACT
| Category | Files | Lines | Size |
|----------|-------|-------|------|
| src/db/ deletion | 16 files | ~800 lines | ~40KB |
| migrations/ deletion | 4 files | ~SQL | ~2.6MB |
| dbmigration/ archive | 7 docs | N/A | ~60KB |
| scripts/ archive | 9 files | N/A | ~2.5MB |
| functions/api/d1/ delete | 1 file | ~100 lines | ~4KB |
| provider.ts slim | 1 file | -600 lines | -24KB |
| **TOTAL** | **~38 items** | **~1500 lines removed** | **~5.2MB freed** |

**Risk level: LOW** — Deletions only. No refactoring. Build verification after each step.
