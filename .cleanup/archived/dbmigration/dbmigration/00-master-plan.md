# DB Migration Master Plan — Airtable → Cloudflare D1

## Strategy
Work on a dedicated git branch. The live site on `main` continues using Airtable throughout.
Only merge to `main` when local testing is complete and you are confident.

```
main branch         →  live domain  →  Airtable   ✅ untouched
d1-migration branch →  local dev    →  D1         🧪 safe
```

---

## Key Decisions Made

| Decision | Choice | Rationale |
|---|---|---|
| ORM | Drizzle ORM | TypeScript-first, native D1 support, generates migrations |
| Primary Keys | Keep Airtable `rec...` IDs for migrated rows; `crypto.randomUUID()` for new rows | Zero FK remapping during migration |
| Response Shape | Option B — clean snake_case SQL shape | App is already being refactored; don't carry Airtable baggage |
| Field names in DB | `snake_case` | Standard SQL convention; Drizzle maps to TS camelCase |
| Backend Access Layer | Typed query functions per table in `src/db/queries/` | Type-safe, no SQL injection risk, explicit control |
| Data Provider | Environment variable switch (`DATA_PROVIDER=d1\|airtable`) | Zero-risk rollback at any time |
| Pagination | Offset-based (`LIMIT` / `OFFSET`) | Matches current Airtable offset pattern; simple to implement |

---

## Phase Checklist

### PHASE 0 — Analysis ✅ COMPLETE
- [x] Inventory all Airtable tables (16 tables found)
- [x] Extract all field references (200+ fields, 2 hardcoded violations)
- [x] Document all write operations (47 total: 12 creates, 32 updates, 3 deletes)
- [x] Identify Airtable-specific behaviors (linked records, formulas, attachments, etc.)
- [x] Map raw API shapes → TypeScript domain models
- [x] Produce documentation (this folder)

### PHASE 1 — Git Branch + D1 Database Setup
- [ ] `git checkout -b d1-migration`
- [ ] `npx wrangler d1 create ops-dashboard-db`
- [ ] Add D1 binding to `wrangler.toml` (branch only)
- [ ] Install Drizzle: `npm install drizzle-orm` and `npm install -D drizzle-kit`
- [ ] Create `drizzle.config.ts`
- [ ] Create `src/db/schema.ts` (from `05-sql-schema.md`)
- [ ] Run initial migration: `npx drizzle-kit generate` + `npx wrangler d1 migrations apply`

### PHASE 2 — Data Migration (One-Time Export/Import)
- [ ] Export full Airtable backup while it's accessible (JSON dump script)
- [ ] Write transform script: maps Airtable fields → SQL columns (see `02-field-map.md`)
- [ ] Handle linked record arrays → junction table rows
- [ ] Insert in correct order: users → products → profiles → bms → ad_accounts → pages → pixels → junctions → video_scripts → videos → campaigns → etc.
- [ ] Verify row counts match Airtable

### PHASE 3 — Backend: Replace Airtable Proxy with D1 Layer
- [ ] Create `src/db/client.ts` — Drizzle D1 client
- [ ] Create `src/db/queries/` — one file per table with typed CRUD functions
- [ ] Implement data provider abstraction in `src/data/provider.ts`
  - `DATA_PROVIDER=airtable` → existing airtable proxy
  - `DATA_PROVIDER=d1` → new D1 queries
- [ ] Fix 2 hardcoded field violations (see `02-field-map.md` section 11)
- [ ] Replace `filterByFormula` with SQL WHERE clauses (see `04-edge-cases.md`)
- [ ] Replace `sort[]` params with SQL ORDER BY
- [ ] Implement batch operations using SQL transactions

### PHASE 4 — Frontend Updates
- [ ] Update `FIELDS` config string values: `'Profile Name'` → `'profile_name'`
- [ ] Update mapper functions in all `data.ts` files to use snake_case field names
- [ ] Update status normalization (already normalized in domain; just update field reads)
- [ ] Update API call URLs if path structure changes
- [ ] Verify attachment handling (product images/logos — `product_assets` table)

### PHASE 5 — Local Testing
- [ ] Run full app locally against D1 (`DATA_PROVIDER=d1`)
- [ ] Test all reads: infrastructure tree, videos grid, campaigns, products, etc.
- [ ] Test all writes: token validation, sync operations, video status updates, campaign launch
- [ ] Test edge cases: batch operations, linked record resolution, pagination
- [ ] Run Playwright test suite

### PHASE 6 — Deploy
- [ ] Merge `d1-migration` → `main`
- [ ] Add D1 binding to production Cloudflare Pages project (dashboard)
- [ ] Set `DATA_PROVIDER=d1` in Cloudflare Pages production env vars
- [ ] Push to GitHub → auto-deploy
- [ ] Monitor, verify row counts

---

## Files in This Folder

| File | Contents |
|---|---|
| `00-master-plan.md` | This file — strategy, phases, decisions |
| `01-table-inventory.md` | All 16 Airtable tables, their roles, and relationships |
| `02-field-map.md` | Every field: Airtable name → JS key → SQL column → type |
| `03-write-operations.md` | All 47 write paths that must be re-implemented |
| `04-edge-cases.md` | Airtable behaviors that need special SQL handling |
| `05-sql-schema.md` | Complete D1/Drizzle schema blueprint (23 tables) |

---

## Scope Summary

- **16 Airtable tables** → **23 SQL tables** (junction tables added for many-to-many)
- **200+ fields** to remap
- **47 write operations** to re-implement
- **2 hardcoded field violations** to fix before migration
- **~15 filterByFormula calls** to convert to SQL WHERE
- **10 linked record arrays** becoming junction tables

---

## Risk Matrix

| Risk | Impact | Mitigation |
|---|---|---|
| Missed field reference | Frontend crash | Grep audit in `02-field-map.md` |
| Broken linked record relation | Data inconsistency | Junction tables + FK constraints |
| Incorrect nullability | Insert failure | Schema review in `05-sql-schema.md` |
| filterByFormula not replaced | Missing/wrong data | Full audit in `04-edge-cases.md` |
| Computed fields written to DB | Stale data | Marked clearly in `04-edge-cases.md` |
| Attachment URLs break | Missing images | Migrate to Cloudflare R2 or store as-is |
| Token/sensitive field exposure | Security breach | Implement field stripping in D1 query layer |
| Status normalization mismatch | UI shows raw strings | Test all status enums |
| Batch size limits | Data truncation | SQL transactions replace Airtable 10-record limit |
| Data mismatch after migration | Missing records | Row count verification step in Phase 2 |
