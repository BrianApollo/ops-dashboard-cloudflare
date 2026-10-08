# Airtable → Cloudflare D1 Parallel Migration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run a full duplicate of the ops dashboard (UI + database) on Cloudflare D1 alongside the live Airtable-backed production, test everything on the clone, then cut production over with a single env-var flip — with a tested rollback path.

**Architecture:** Keep the existing React SPA and `/api/airtable/[[path]]` proxy contract **unchanged**. Build an Airtable-API-compatible shim inside that same Pages Function that serves the identical REST dialect from a D1 mirror store. A deployment-level env var (`DATA_BACKEND=airtable|d1`) selects the backend, so the production project and the clone project run the same code.

**Tech Stack:** Cloudflare Pages + Functions, D1 (SQLite), R2 (existing `service-worker` presign worker, unchanged), Workers (scheduled-executor clone), Node scripts for mirroring.

**Spec:** Part 1 of this document (current-state analysis) is the spec; Parts 2–3 record decisions and risks; Part 4 is the executable task plan.

## Global Constraints

- The live site (Pages project `ops-dashboard`, branch `main`) must never read from or write to D1 until cutover. All clone work happens on branch `d1-shim` and a second Pages project.
- The clone's scheduled-executor must NEVER execute real Facebook budget/status changes during the parallel phase (dry-run only, crons disabled).
- Airtable record IDs (`rec…`) are preserved as D1 primary keys. New records created in D1 get `rec` + 14 random base62 chars so existing code that checks `id.startsWith('rec')` keeps working (`src/features/images/storage.ts:65`).
- Frontend `src/**` changes: **zero** (that is the acceptance test of the shim). The only repo-code changes are in `functions/**`, `workers/**`, `scripts/**`, and `wrangler.toml`.
- Business timezone GMT+7 everywhere scheduling is involved (`workers/scheduled-executor/src/types.ts`).
- `VITE_DATA_PROVIDER` stays **unset** on both deployments — the dormant `=== 'd1'` branches in `src/features/infrastructure/data.ts` and `src/features/rules/data.ts` point at a dead `/api/d1/*` API from the February attempt and must not be triggered.

---

# Part 1 — Current-State Analysis (the spec)

## 1.1 System map

```
Browser (React/Vite/MUI SPA, JWT in cookie+localStorage)
  │
  ├─ /api/auth/login|logout|me ─────────── Pages Fn → Airtable Users table (direct fetch)
  ├─ /api/airtable/[[path]] ────────────── Pages Fn (JWT + table perms + field strip) → api.airtable.com, base appxboZ807TMD4KX0
  ├─ /api/facebook/proxy ───────────────── Pages Fn → graph.facebook.com v21.0 (appsecret_proof)
  ├─ /api/redtrack/[[path]] ────────────── Pages Fn → api.redtrack.io
  ├─ /api/cloudflare/images/:id (DELETE) ─ Pages Fn → Cloudflare Images API
  ├─ VITE_CF_STORAGE_WORKER_URL ────────── service-worker.management-23c.workers.dev (R2 presign/delete; separate repo)
  ├─ VITE_IMAGE_GENERATION_URL ─────────── n8n webhook (trustapollo.app.n8n.cloud) — n8n then WRITES rows into Airtable "Temp Images"
  ├─ graph.facebook.com (direct) ───────── Profile Hub token check (browser-side, token from Profiles record)
  └─ 127.0.0.1:50326 ───────────────────── AdsPower local bridge (staff PC)

ops-scheduled-executor Worker (separate deploy, crons 17:00 UTC + hourly)
  └─ api.airtable.com directly (own AIRTABLE_API_KEY secret): reads Master Profile→Profiles token,
     Schedule, Scaling Rules; writes Schedule status/results, Rule Execution Log (typecast:true);
     executes real FB budget/status changes with the master profile token.

External writers into the same Airtable base (NOT via the app):
  • n8n image generation → creates "Temp Images" rows
  • Jay's Claude skills → "AI Videos" row creation, "Video Data" JSON on Videos/AI Videos,
    script-count reads (REST, PAT in ~/.claude/skills/accotta-script-count/.env)
  • Staff editing Airtable directly (Profile Setup Summary is Airtable-only — zero code references)
```

## 1.2 The database: 21 tables

Live schema snapshot taken 2026-10-08 via the metadata API (full dump: `docs/superpowers/plans/airtable-schema-2026-10-08.md`). Row counts are from the February migration dump — re-count at migration time; everything is small (<5k rows total expected).

| Table | ID | Addressed in code by | App R/W | Rows (Feb) | Notes |
|---|---|---|---|---|---|
| Users | tblvN3ErbnvZ76Lzr | name | R (login writes Password hash) | 6 | Auth + editor dropdowns |
| Profiles | tble3Qky3A2j8LpSj | **ID** (infra) and **name** (Profile Hub) | R/W | 5 | 47 fields now (Profile Hub SOP fields, 3 attachment fields) |
| Business Managers | tbl1xnWkoju7WG8lb | ID | R/W | 7 | Sync creates/updates |
| Ad Accounts | tbltReEL235grY3Im | ID | R/W | 41 | |
| Pages | tblUwiY8UQVi3yXBU | ID | R/W | 15 | |
| Pixels | tblsMDmQedp4B3pB8 | ID | R/W | 14 | |
| Products | tbl1haQz7j9qlE9XE | name | R/W | 2 | 2 attachment fields; 10 count fields (unused by app) |
| Advertorials | tblYiqgkE6NYQj21s | name | R/W | 2 | richText field |
| Ad Presets | tblMcc1SdR3kLdpD0 | name | R/W | 3 | |
| Campaigns | tblueon6lG95vAu5l | name | R/W | 33 | 39 fields; 2 attachment fields; heavy launch writes |
| Video Scripts | tbl7qb7Y2AzTfKBl8 | name | R/W | 174 | Count fields + Calculation ARE read by app |
| Videos | tblpb2c1RqYnALFTV | name | R/W | 1126 | Biggest table; editor portal writes |
| AI Videos | tblrP02jgMlNc6sF3 | name | R/W | — (new) | Also written by Claude skills |
| Images | tbl7OCC0E1ICXXffI | name | R/W | 340 | |
| Temp Images | tbl9lFboovT1cJTSo | name | R/D | 5 | Created by n8n, deleted by app |
| Master Profile | tblFkD3XanEvDgztj | name | R | 1 | Worker reads it for the master token |
| Campaign Launch Setup | tblkQzt0h5rBFbRH6 | name | R/W | — (new) | Per-product launch defaults |
| Profile Setup Summary | tbl2zrm40IvsLLPB7 | — | none | — (new) | Airtable-only; migrate data, no code |
| Schedule | tblOPFwzts4bShrLH | name | R/W (app + worker) | — (new) | |
| Scaling Rules | tblsTmZYWX28hTOwN | name | R/W (app + worker) | 6 | |
| Rule Execution Log | tbl8DkUsl5e7kYHIx | name | W (worker, typecast) | — (new) | LogTab reads via Schedule table, not this |

## 1.3 The February D1 attempt — what exists, what's lost, what's stale

- **Survives in repo:** full phase-0 analysis (`.cleanup/archived/dbmigration/` — field map, 47 write ops, edge cases), generated DDL (`.cleanup/archived/migrations/0000_cultured_sleepwalker.sql`), drizzle snapshot JSON, export script (`.cleanup/archived/scripts/migrate-to-d1.mjs`), reset scripts (`scripts/clear-d1.sql`, `full-reset.sql`), a D1 database id `212507bb-6f00-4244-99c2-ff6b609b24bd` (`ops-dashboard-db`, commented out in `workers/scheduled-executor/wrangler.toml`).
- **Lost:** `src/db/schema.ts`, `src/db/queries/*`, and the old `/api/d1/*` Pages Functions were never committed to git and are not in the backup zips.
- **Stale:** the archived docs predate 5 new tables (AI Videos, Campaign Launch Setup, Profile Setup Summary, Schedule, Rule Execution Log), the Profile Hub expansion of Profiles (23→47 fields incl. 3 attachment fields), attachment fields on Campaigns (Nadeems PDF, Sakshis Video), and an Images table that **no longer has** Status/Type/Width/Height/Thumbnail/Drive File ID fields the docs list.
- **Why the old approach stalled (inference):** it changed the response shape (snake_case "Option B"), which forced edits in every `data.ts` + all FIELDS maps + all mappers, while the app kept evolving on main. The strategy below avoids exactly that.

## 1.4 The Airtable API contract the app actually uses (the compat surface)

From a full audit of `src/**`, `functions/**`, `workers/**`:

**Requests:** `GET table` (list, cursor `offset`), `GET table/recId`, `POST table` with `{fields}` or `{records:[…], typecast?}`, `PATCH table/recId` with `{fields, typecast?}`, `PATCH table` with `{records:[…]}` (10-chunk), `DELETE table/recId`, `DELETE table?records[]=…`. Query params used: `filterByFormula`, `sort[0][field]`, `sort[0][direction]`, `fields[]`, `maxRecords`, `offset`. Tables addressed by **name** everywhere except the 5 infra tables (by **table ID**) — the shim must accept both.

**Formulas used (complete list):**
- `{Field} = 'value'` and `({Field} = 'value')` — incl. **linked-record fields compared to display names** (`{Product} = 'GhostWing'`): Airtable coerces a linked field to the linked record's primary-field value in formula context.
- `AND({FB Campaign ID} != '', {Product} != '')`
- `OR({FB Campaign ID} = 'x', {FB Campaign ID} = 'y', …)` and `OR({Status}='Success',{Status}='Failed')`
- `AND({Status} = 'Pending', IS_BEFORE({Scheduled At}, DATEADD('YYYY-MM-DD', 1, 'days')))` (worker)
- `{Email} = '…'` (login), `{Role} = 'Video Editor'`, `FIND("recId", ARRAYJOIN({Product}))` (ad-presets legacy path)

**Response shape:** `{records:[{id, fields, createdTime}], offset?}` / single record `{id, fields, createdTime}`. Airtable **omits empty fields** — the mappers all do `typeof` checks so omission is safe and must be mirrored.

**Semantics the shim must reproduce:**
1. **Inverse links.** Writing one side of a link updates the other. The app depends on this: `addVideoIdsToCampaign` writes `Campaigns."Videos Used In This Campaign"` and the Videos side reads `"Used In Campaign"`; `getScriptCounts` reads `Video Scripts."Videos"` which only exists as the inverse of `Videos."Script"`. Full pair table (28 pairs) extracted from the live schema — see §1.5.
2. **Computed fields actually read by the app** (everything else computed can be dropped):
   - `Videos."Script Content (from Script)"` and `AI Videos."Script Content (from Script)"` — lookup → derive from linked Script's `Script Content`, returned as 1-element array.
   - `Video Scripts."Videos"` (inverse link array), `"Scripts Past To Do"` (count of linked Videos with Status ≠ 'To Do'), `"Scripts To Do"` (count with Status = 'To Do'), `"Calculation"` = PastToDo/(ToDo+PastToDo) as 0–1 number (percent).
   - `Videos."Last Upload At"` / `AI Videos."Last Upload At"` (lastModifiedTime) — shim maintains an `updated_at` and serves it under the same field name.
   - `Temp Images."id"` and `Schedule."Formula"`/`"Name (from Linked Campaign)"`/`"Last Reponse Time"` — verify in Task 2.9 whether read; serve stored mirror value if so.
3. **Attachment fields.** Read: array of `{id, url, filename, size?, type?, thumbnails?}`. Write (Profile Hub `uploadAttachment`): array mixing `{id}` (keep existing) and `{url, filename}` (add new) — Airtable merges by id and ingests the URL. The shim stores the array as JSON; a `{url, filename}` entry gets a generated `att…` id and the URL stored **as-is** (files are already on R2 — no re-download needed, which is simpler than Airtable).
4. **Writable-field validation.** Writing unknown or computed fields returns 422 `UNKNOWN_FIELD_NAME` / `INVALID_VALUE_FOR_COLUMN`. The code whitelists writable fields and relies on 422s being absent; `scripts/data.ts` references ghost fields (`Approved`, `Revision Needed`, `Version`) that no longer exist in the base — they are read-only usages, so harmless, but the shim must likewise not reject unknown fields on READ (they're simply absent) and must 422 on WRITE of computed fields to match Airtable.
5. **typecast:true** (Profile Hub writes, worker Rule Execution Log creation): unknown select choices are accepted as strings. The mirror store has no select validation, so this is free — just don't reject it.
6. **Rate limit:** client throttles to 5 req/s (`airtable-throttle.ts`); harmless against the shim (leave it — removing it is an optional post-cutover cleanup).
7. **Record IDs** `rec` + 14 chars; attachment IDs `att` + 14 chars.

## 1.5 Link pairs the shim must keep in sync (from live schema)

```
Users.Videos ↔ Videos.Editor                      Products.Videos ↔ Videos.Product
Users."Video Scripts" ↔ Video Scripts.Author      Products.Campaigns ↔ Campaigns.Product
Users."Videos copy" ↔ AI Videos.Editor            Products.Images ↔ Images.Product
Profiles."Linked BM" ↔ Business Managers."Linked Profile"
Profiles."Linked Pages" ↔ Pages."Linked Profiles"
Profiles."Master Profile" ↔ Master Profile."Profile Record"
Business Managers."Linked Ad Accs" ↔ Ad Accounts."Linked BM"
Business Managers."Linked Pixels" ↔ Pixels."Linked BMs"
Business Managers."Owned Pixels" ↔ Pixels."Owner BM"
Business Managers."Ad Accounts" ↔ Ad Accounts."Owner BM"
Products.Advertorials ↔ Advertorials.Product      Products."Ad Profiles" ↔ Ad Presets.Product
Products."Video Scripts" ↔ Video Scripts.Product  Products."Temp Images" ↔ Temp Images.Product
Products."Videos copy" ↔ AI Videos.Product        Products."Campaign Launch Setup" ↔ Campaign Launch Setup.Product
Ad Presets.Campaigns ↔ Campaigns."Selected Ad Profile"
Campaigns."Videos Used In This Campaign" ↔ Videos."Used In Campaign"
Campaigns."Images Used In This Campaign" ↔ Images."Used In Campaigns"
Campaigns."Videos copy" ↔ AI Videos."Used In Campaign"
Campaigns.Schedule ↔ Schedule."Linked Campaign"
Campaigns."Scaling Rules" ↔ Scaling Rules."Applies to [Campaigns]"
Video Scripts.Videos ↔ Videos.Script
Schedule."From Rule" ↔ Scaling Rules.Schedule
Scaling Rules."Rule Execution Log" ↔ Rule Execution Log."Rule ID"
```

Primary fields (for formula display-name coercion): Users=Name, Profiles=Profile ID, BMs=BM ID, Ad Accounts=Ad Acc ID, Pages=Page ID, Pixels=Pixel ID, Products=Product Name, Advertorials=Advertorial Name, Ad Presets=Preset Name, Campaigns=Name, Video Scripts=Name, Videos=Video Name, AI Videos=Video Name, Images=Image Name, Master Profile=Name, Campaign Launch Setup=Name, Scaling Rules=Name, Rule Execution Log=Rule Name.

---

# Part 2 — Strategy decision

## Chosen: Option A — Airtable-compatible shim over a 1:1 D1 mirror store

Store every record exactly as Airtable serves it:

```sql
CREATE TABLE records (
  table_name  TEXT NOT NULL,      -- canonical table name ("Videos")
  id          TEXT NOT NULL,      -- rec…
  fields      TEXT NOT NULL,      -- JSON, Airtable field names as keys
  created_time TEXT NOT NULL,     -- ISO
  updated_at  TEXT NOT NULL,      -- shim-maintained (serves "Last Upload At")
  PRIMARY KEY (table_name, id)
);
CREATE TABLE mutations_log (      -- rollback/replay insurance
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL, table_name TEXT NOT NULL, op TEXT NOT NULL,  -- create|update|delete
  record_id TEXT NOT NULL, payload TEXT
);
CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT);  -- schema snapshot, mirror timestamps
```

Tables are tiny (biggest ~1–3k rows), so the shim loads a whole table per request (one indexed D1 query), applies filter/sort/fields/pagination in JS, and returns Airtable-shaped JSON. No per-table SQL, no migrations when fields are added, and the mirror job is a dumb copy.

**Why over Option B (per-table snake_case schema — the February approach):** B was already tried; it requires touching every `data.ts`, every FIELDS map, every mapper, plus junction handling — and it went stale against 8 months of app evolution. A touches zero frontend files, handles the 5 new tables for free, and makes "duplicate the database" literal. **Tradeoff accepted:** D1 is not relationally queryable per-column during the shim era, and formula evaluation lives in TS. Once Airtable is retired and things are stable, Option B becomes an optional internal refactor (the archived DDL/docs remain the starting point) with no user-facing risk.

## What stays byte-identical (duplicated, zero changes)

- Entire `src/**` frontend, `dist` build, theme, routing, permissions UI.
- `functions/api/facebook/proxy.ts`, `functions/api/redtrack/[[path]].ts`, `functions/api/cloudflare/images/[id].ts`, `functions/lib/auth.ts`.
- R2 storage worker (`service-worker.management-23c.workers.dev`), bucket, `accotta.me` mapping — both deployments share it (uploads land in the same bucket; acceptable for the test phase since filenames are deterministic and the clone is for testing).
- n8n webhooks, AdsPower bridge, RedTrack, FB app — shared.
- All Pages secrets except the two new vars below.

## What changes (the actual work)

| Component | Change |
|---|---|
| `functions/api/airtable/[[path]].ts` | Becomes a thin dispatcher: `env.DATA_BACKEND === 'd1'` → new shim module; else existing proxy code unchanged. |
| `functions/lib/airtable-shim/` (new) | The shim: router, mirror-store access, formula evaluator, inverse-link maintenance, computed fields, attachment merge, mutations log. The one genuinely new component (~700 lines). |
| `functions/api/auth/login.ts` | Same dispatch: user lookup + password-hash auto-migrate go to D1 when `DATA_BACKEND=d1`. |
| `scripts/mirror-airtable-to-d1.mjs` (new) | Full re-runnable mirror: fetch all 21 tables → upsert `records` rows; copy attachments to R2 and rewrite their URLs; write snapshot meta. Derived from the archived `migrate-to-d1.mjs` fetch/throttle/escape helpers. |
| `wrangler.toml` | Add `[[d1_databases]]` binding `DB` (present in both projects; inert when `DATA_BACKEND=airtable`). |
| `workers/scheduled-executor` | Add the same `DATA_BACKEND` switch in `airtable.ts`-equivalent reads/writes (Schedule, Scaling Rules, Master Profile→token, Rule Execution Log). Clone deploys as `ops-scheduled-executor-d1`, **no crons**, dry-run default. |

## What deserves a rewrite (deferred — do NOT bundle into the migration)

1. **`Launch Date` field collision** — `FIELD_LAUNCH_DATE` and `FIELD_LAUNCHED_AT` are both `'Launch Date'` (`src/features/campaigns/data.ts:55-58`); draft saves and launch stamps overwrite each other today. Migrating 1:1 preserves the bug (correct for parity). Fix post-cutover by adding a second column in D1 — trivial then, impossible to do safely mid-migration.
2. **Permissions table addressing mismatch** — `ADMIN_ONLY_TABLES` blocks the 5 infra tables by **ID** but Profile Hub reaches `Profiles` by **name**, bypassing the table-level block (field stripping still applies, but ~20 new Profile Hub fields incl. Recovery Codes and SOP screenshots are NOT in `SENSITIVE_FIELDS`). Fix in `functions/lib/permissions.ts` by normalizing name↔ID — safe to do now since it's backend-only and backend-agnostic; included as Task 2.8.
3. **Dead code:** `/api/d1` branches in `infrastructure/data.ts` + `rules/data.ts`, `provider.ts` stubs, `drizzle-orm` dependency, root zips and `.cleanup/`. Post-cutover cleanup.
4. **Nice-to-have later:** per-table real schema (Option B), automated tests beyond the contract harness, bundle splitting — all in `.cleanup/health-package/risk-and-debt-log.md`, none load-bearing for this migration.

---

# Part 3 — Breaking-point register

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| B1 | **Inverse links not maintained** → campaign/video/script relations silently wrong (scripts show 0/N uploads, videos lose campaign history) | Critical | Link-pair table §1.5 is hardcoded into the shim; contract tests assert both sides after every link write. |
| B2 | **Formula display-name coercion** — `{Product}='Name'` filters return empty if the shim compares against rec-ids | Critical | Evaluator resolves linked-record fields to target-table primary-field values before comparing. Contract test per filtering module. |
| B3 | **External writers keep writing to Airtable during parallel run** (n8n → Temp Images; Claude skills → AI Videos/Video Data; staff edits; production executor → Schedule) → clone drifts | Expected/accepted | Clone data is disposable; scheduled full re-mirror (hourly or on-demand) resets drift. At cutover: freeze, final mirror, then repoint externals (see Phase 6 checklist). |
| B4 | **Attachment URLs** — Airtable CDN URLs expire; a frozen mirror serves dead image links within hours | High | Mirror job downloads every attachment once and rewrites `url` to a copied R2 object (`airtable-attachments/<table>/<recId>/<attId>-<filename>`); idempotent by attachment id. |
| B5 | **Clone executor fires real FB changes** → double budget changes on live campaigns | Critical | Clone worker: crons removed, `DRY_RUN=true` default, requires `?confirm=live` to execute; verified before any clone Schedule rows exist. |
| B6 | **Login auto-migrate writes** — plaintext→hash upgrade must hit the same store the login read from, or users get locked out of one side | Medium | Login dispatches read+write to the active backend only. Parallel-phase caveat: a password changed via clone exists only in clone (document for testers). |
| B7 | **`Last Upload At` is lastModifiedTime** — editor portal displays it; a mirror copies stale values and the shim must advance it on writes | Medium | `records.updated_at` set on every PATCH/POST; served under the table's lastModifiedTime field name for Videos/AI Videos. |
| B8 | **Count/lookup fields read by app** (`Scripts Past To Do`, `Videos` inverse, `Script Content (from Script)`, `Calculation`) | High | Derived at read time in the shim (§1.4.2); contract tests compare derived values against live Airtable values for the same data. |
| B9 | **Batch + pagination dialect** — `{records:[…]}` arrays, 10-item chunks, `DELETE ?records[]=`, opaque `offset` cursor | High | Shim implements the exact dialect; offset token = base64 of numeric index; page size 100 like Airtable. |
| B10 | **Two Pages projects, one R2 bucket / FB app / RedTrack** — clone tests that upload/delete files or rename products mutate shared storage | Medium | Accept for mock tests (deterministic filenames mean collisions are visible); avoid destructive R2 tests on real product folders; `VITE_ENABLE_REAL_CAMPAIGN_LAUNCH=false` on the clone. |
| B11 | **Old D1 database may still hold February data** (`ops-dashboard-db` id 212507bb…) | Low | Phase 0 verifies existence; wipe with `scripts/full-reset.sql` logic or create a fresh DB and update the binding id. |
| B12 | ~~Wrangler account mismatch~~ **RESOLVED 2026-10-08:** the dashboard lives on the **Apollo** account (admin@apolloglobalenterprises.com, acct 1b61024e…), live at app.trustapollo.com / ops-dashboard-1sv.pages.dev — and wrangler on this machine is already authed to it. `ops-dashboard-db` (212507bb…, Feb 2026, 2.1MB) also confirmed to exist there. Only the R2 storage worker is on the Accotta account, reached by URL (no auth needed). | — | None needed. |
| B13 | **Airtable automations/interfaces** can't be enumerated via API | Unknown | Phase 0 manual checklist item: Jay opens the base → Automations tab and lists anything active; each found automation becomes a repoint item at cutover. |
| B14 | **JWT sessions** — same `JWT_SECRET` on both projects means a token minted on one works on the other (cookies are per-domain anyway) | Low | Keep same secret (convenient for testers). Note: `sub` is the Airtable Users rec-id, which is identical in the mirror, so permissions carry over cleanly. |
| B15 | **Ghost fields in code** (`Approved`, `Revision Needed`, `Version` on Video Scripts) read fields absent from the live base | Low | Read-only usages → absent in mirror → `undefined`, same as today. No action. |
| B16 | **Secrets hygiene** — the Airtable PAT, FB app secret, RedTrack key and JWT secret have now been pasted into several chats/docs | Low (housekeeping) | After cutover, rotate the Airtable PAT (it becomes archive-read-only anyway), and consider rotating FB_APP_SECRET + JWT_SECRET. |
| B17 | **Cloudflare Images delete proxy** needs `CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_IMAGES_API_TOKEN` — not in the env list you pasted | Low | Check whether they're set on the live project (`wrangler pages secret list`); copy to clone if present. |

---

# Part 4 — Implementation plan

Effort estimate: Phase 1 ≈ 1 day, Phase 2 ≈ 2–3 days, Phase 3 ≈ 1 day, Phase 4 ≈ ½ day, Phase 5 (mock test) ≈ ½–1 day. Phases 6–7 are operational.

### Task 0: Prerequisites & account verification

**Files:** none (operational)

- [x] **Step 0.1:** DONE 2026-10-08 — wrangler is authed as admin@apolloglobalenterprises.com (acct 1b61024e…), which is where `ops-dashboard` lives (app.trustapollo.com / ops-dashboard-1sv.pages.dev). No re-login needed.
- [x] **Step 0.2 (partial):** DONE 2026-10-08 — `ops-dashboard-db` (212507bb…, created 2026-02-21, 2.1MB) still exists. Decision: leave it alone and `npx wrangler d1 create ops-dashboard-db-v2` for a clean start (user wants a brand-new database); put the new id in `wrangler.toml`.
- [ ] **Step 0.3:** `npx wrangler pages secret list --project-name ops-dashboard` — inventory live secrets (expect AIRTABLE_API_KEY, AIRTABLE_BASE_ID, REDTRACK_*, FB_*, JWT_SECRET; check for CLOUDFLARE_ACCOUNT_ID/CLOUDFLARE_IMAGES_API_TOKEN per B17).
- [ ] **Step 0.4 (Jay, manual):** Airtable base → Automations + Interfaces: list anything active; add each to the Phase 6 repoint checklist. Also confirm no Airtable forms feed these tables.
- [ ] **Step 0.5:** `git checkout -b d1-shim` and push the branch.

### Task 1: Mirror store + mirror script

**Files:**
- Create: `scripts/d1/schema.sql` (the 3 tables from Part 2)
- Create: `scripts/mirror-airtable-to-d1.mjs`
- Modify: `wrangler.toml` (add `[[d1_databases]] binding="DB" database_name="ops-dashboard-db" database_id="<from Task 0>"`)

**Interfaces:** Produces the `records`/`mutations_log`/`meta` tables exactly as defined in Part 2; the shim (Task 2) consumes them. Mirror writes `meta('schema','<metadata API tables JSON>')` and `meta('last_mirror','<ISO>')`.

- [ ] **Step 1.1:** Write `scripts/d1/schema.sql` (DDL from Part 2 verbatim) and apply: `npx wrangler d1 execute ops-dashboard-db --remote --file scripts/d1/schema.sql`. Verify with a `sqlite_master` query.
- [ ] **Step 1.2:** Write `scripts/mirror-airtable-to-d1.mjs`. Skeleton: reuse `atFetch`/`fetchAll` throttled helpers from `.cleanup/archived/scripts/migrate-to-d1.mjs:52-79`; table list = the 21 names from §1.2; for each record emit `INSERT OR REPLACE INTO records (table_name,id,fields,created_time,updated_at) VALUES (?,?,json,?,createdTime-or-LastUploadAt)` — for Videos/AI Videos seed `updated_at` from the record's `Last Upload At` field so the portal shows true times. Also fetch `GET /v0/meta/bases/{base}/tables` into `meta.schema`. Output a single `scripts/d1/mirror.sql` file plus `node … --apply` mode that shells out to `wrangler d1 execute --remote --file`. Reuse the archived script's `sqlVal`/printf escaping for multiline JSON.
- [ ] **Step 1.3:** Attachment copying inside the mirror script: for each attachment field value (detect: array of objects with `url`+`filename`), for each entry not already rewritten (`url` not containing your R2 domain): GET the Airtable CDN URL → PUT to R2 via the existing storage worker presign flow (`POST ${CF_STORAGE_WORKER_URL}/presign`, then PUT) under `airtable-attachments/<table>/<recId>/<attId>-<filename>`; rewrite `url` in the stored JSON, keep `id`/`filename`/`size`/`type`. Affected fields: Products (Product Logo, Product Images), Profiles (SOP 7/8/9 Screenshot), Campaigns (Nadeems PDF, Sakshis Video), Videos (Video Upload).
- [ ] **Step 1.4:** Run the full mirror. Verify: `SELECT table_name, COUNT(*) FROM records GROUP BY table_name` matches live Airtable counts (print them from the script); spot-check one Videos row's JSON equals the REST response for the same record (minus attachment URL rewrites).
- [ ] **Step 1.5:** Re-run the mirror and verify idempotence (same counts, no duplicate attachment copies).
- [ ] **Step 1.6:** Commit.

### Task 2: The shim (`functions/lib/airtable-shim/`)

**Files:**
- Create: `functions/lib/airtable-shim/index.ts` (router: parse path → table/record, dispatch by method)
- Create: `functions/lib/airtable-shim/store.ts` (D1 access: loadTable, getRecord, create, update, delete, bumpUpdatedAt, logMutation, newRecId/newAttId)
- Create: `functions/lib/airtable-shim/formula.ts` (evaluator)
- Create: `functions/lib/airtable-shim/links.ts` (LINK_PAIRS table from §1.5 + applyInverseLinks(before, after))
- Create: `functions/lib/airtable-shim/computed.ts` (derived fields from §1.4.2)
- Create: `functions/lib/airtable-shim/tables.ts` (name↔ID map for the 21 tables, primary-field map, attachment-field list, computed-field list per table)
- Modify: `functions/api/airtable/[[path]].ts` (dispatch on `env.DATA_BACKEND`)
- Modify: `functions/api/auth/login.ts` (dispatch user lookup + hash-migrate write)

**Interfaces:**
- `handleShimRequest(request: Request, env: Env, user: UserSession, pathSegments: string[]): Promise<Response>` — called from the existing `onRequest` after auth+permission checks, which stay shared for both backends.
- `evaluateFormula(src: string, record, ctx: {resolveLinks(tableName, ids): string[]}) : boolean` — supports exactly: `{Field}`, string/number literals, `=`, `!=`, `AND(…)`, `OR(…)`, `FIND(needle, hay)`, `ARRAYJOIN({Field})`, `IS_BEFORE(a, b)`, `DATEADD('date', n, 'days')`, parenthesized terms. Anything else → 422 `INVALID_FILTER_BY_FORMULA` (matches Airtable's failure mode and surfaces unsupported usage loudly instead of returning wrong data).
- Linked-field coercion rule: when a `{Field}` holding `["rec…"]` is compared to a string or passed to ARRAYJOIN, resolve ids → primary-field values of the linked table, join with `,`.

- [ ] **Step 2.1:** `tables.ts` — generate from `meta.schema` at cold start (cache per isolate) rather than hardcoding: name↔id, primaryField, per-table list of attachment fields, computed field names (formula/rollup/count/lookup/lastModifiedTime/button/createdTime types). This keeps the shim correct if fields are added before cutover.
- [ ] **Step 2.2:** `store.ts` + `index.ts` for reads: `GET /:table` (accept name or tbl-id) with `fields[]`, `maxRecords`, `sort[n][field]/[direction]` (string compare, numbers numerically, missing last), pagination (100/page, `offset` = base64 index, include `offset` key only when more remain), and `GET /:table/:id`. Empty-value omission: strip keys whose value is `''`, `[]`, `null`, `false`-for-checkbox? — **No**: match Airtable exactly: Airtable omits unchecked checkboxes and empty strings/arrays; keep numbers 0. Encode that rule once in `serializeRecord()`.
- [ ] **Step 2.3:** Run a manual smoke read: `curl -H "Authorization: Bearer <jwt>" https://<preview>/api/airtable/Products` vs the same against production → identical shapes.
- [ ] **Step 2.4:** `formula.ts` with the grammar above. Unit-test inline (Vitest not set up — use a tiny `node --test` file `functions/lib/airtable-shim/formula.test.mjs` with the 8 real formulas from §1.4 against fixture records).
- [ ] **Step 2.5:** Writes: POST (single + batch + typecast passthrough), PATCH (single + batch), DELETE (single + `?records[]=`). Each write: validate no computed field in payload (422 otherwise), merge fields, bump `updated_at`, `logMutation`, then `applyInverseLinks` (for every link field in the diff: add this id to / remove from the paired field of affected foreign records). Attachment-field writes: entries with only `{id}` → keep matching existing entry; `{url, filename}` → append with generated `att` id.
- [ ] **Step 2.6:** `computed.ts` read-decoration for: `Script Content (from Script)` (Videos + AI Videos), `Videos`/`Scripts To Do`/`Scripts Past To Do`/`Calculation` (Video Scripts), `Last Upload At` (Videos + AI Videos ← `updated_at`). Inverse-link fields are *stored* (mirror carries both sides; writes maintain both sides), so no read-time derivation needed for them.
- [ ] **Step 2.7:** Wire the dispatcher in `functions/api/airtable/[[path]].ts`: after the existing auth + `canAccessTable` + before the Airtable fetch — `if (env.DATA_BACKEND === 'd1') return handleShimRequest(...)`. Sensitive-field stripping: reuse `stripSensitiveFields` on shim GET responses identically.
- [ ] **Step 2.8:** Fix the permissions name/ID mismatch (`functions/lib/permissions.ts`): build `ADMIN_ONLY_TABLES` from both the 5 IDs and their names (`Profiles`, `Business Managers`, `Ad Accounts`, `Pages`, `Pixels`)… **CAUTION:** Profile Hub (admin/ops-only page in UI) hits `Profiles` by name — verify with Jay which non-admin roles, if any, must keep Profile Hub access before enforcing; if editors never use it, enforce; otherwise add a role allowance. Apply the same change to the live Airtable path (it's a pre-existing hole, not shim-specific).
- [ ] **Step 2.9:** Verify Temp Images `id` formula / Schedule computed fields aren't read by UI (grep `fields['id']`, `'Formula'`, `'Name (from Linked Campaign)'`, `'Last Reponse Time'` under `src/features/schedules`, `src/features/images`, `src/components/schedules`); if read, serve stored mirror values (they're already in the JSON) and note staleness for post-cutover rows.
- [ ] **Step 2.10:** `functions/api/auth/login.ts`: extract the user lookup into `findUserByEmail(env)` with the two backends (`SELECT … FROM records WHERE table_name='Users'` + JS email match, vs. existing fetch); hash auto-migrate writes to the active backend. Same JWT output.
- [ ] **Step 2.11:** Commit after each green step above (6+ commits).

### Task 3: Contract test harness (the quality gate)

**Files:**
- Create: `scripts/contract-test.mjs`

**Interfaces:** Consumes two base URLs + a login; exercises the same request list against both and diffs normalized JSON.

- [ ] **Step 3.1:** Write `scripts/contract-test.mjs`: logs in to BOTH deployments (prod Airtable-backed, clone D1-backed) with a test user; runs this fixed request list; sorts records by id; strips volatile keys (attachment `url` hosts, `Last Upload At` second-precision); deep-diffs; prints per-request PASS/FAIL:
  1. `GET Products` • 2. `GET Users?filterByFormula=({Role}='Video Editor')` • 3. `GET Videos?filterByFormula={Product}='<real product name>'` • 4. `GET Video Scripts?fields[]=Scripts Past To Do&fields[]=Videos` • 5. `GET Campaigns?filterByFormula=AND({FB Campaign ID}!='',{Product}!='')&fields[]=FB Campaign ID&fields[]=Product` • 6. `GET tble3Qky3A2j8LpSj` (admin JWT) • 7. `GET Schedule?filterByFormula={Status}='Pending'&sort[0][field]=Scheduled At&sort[0][direction]=asc` • 8. `GET Campaign Launch Setup` • 9. `GET AI Videos?filterByFormula={Product}='<name>'` • 10. `GET Images?filterByFormula={Product}='<name>'` + Temp Images.
- [ ] **Step 3.2:** Write-path tests against the **clone only** (never prod): create a Video Script, create 2 Videos linked to it, assert `Video Scripts.Videos` inverse + `Scripts Past To Do` transitions when a video's Status moves off To Do; link a Video to a Campaign via a `Videos Used In This Campaign` PATCH and assert the Video's `Used In Campaign` side; Profile Hub-style attachment PATCH (keep-1-add-1) asserting merge; batch PATCH of 12 videos (chunking); DELETE batch. Clean up created rows at the end.
- [ ] **Step 3.3:** Run until all green. Every red here is a production incident prevented — do not hand-wave any diff.

### Task 4: Clone deployment

**Files:** none new (operational) — optionally `package.json` script `"deploy:d1": "wrangler pages deploy dist --project-name ops-dashboard-d1 --branch main --commit-dirty=true"`

- [ ] **Step 4.1:** `npx wrangler pages project create ops-dashboard-d1` (production branch `main` of the project is fine; we deploy from the `d1-shim` checkout).
- [ ] **Step 4.2:** Set clone secrets = copy of live ones **plus** `DATA_BACKEND=d1`; D1 binding added via `wrangler.toml` (Task 1); keep `VITE_ENABLE_REAL_CAMPAIGN_LAUNCH=false` in the clone build env.
- [ ] **Step 4.3:** `npm run build && npm run deploy:d1`. Also deploy the same `d1-shim` branch build to a **preview** of the live project? **No** — keep the live project untouched (Global Constraints).
- [ ] **Step 4.4:** Executor clone: in `workers/scheduled-executor`, add `DATA_BACKEND` + `DRY_RUN` env handling (reads/writes via D1 `records` when d1), name `ops-scheduled-executor-d1`, delete the `[triggers]` block for the clone deploy, deploy, verify `GET /` health says d1Enabled:true and `POST /run-rules?dry=true` evaluates against mirrored Scaling Rules without FB writes.
- [ ] **Step 4.5:** Smoke: log in on the clone URL, click through Products.

### Task 5: Mock test (the one you asked to run after planning)

Run on the clone, with a fresh mirror taken immediately before:

- [ ] Login as admin; login as a Video Editor account.
- [ ] Products page: list, product detail, stats, images tab (incl. a Temp Image visible), scripts tab, videos tab, AI videos tab, campaigns tab, setup tab.
- [ ] Editor portal `/videos`: grouped scripts view, per-script done/total counts match production side-by-side, upload a test video (lands in shared R2 — use a throwaway script/slot), status flips to Review, `Last Upload At` updates.
- [ ] Campaign view: open a launched campaign (RedTrack panel loads via shared proxy), rename it, change status, link/unlink a video, check the Videos tab reflects `Used` + campaign link.
- [ ] Campaign launch page: walk to Final Check with launch flag off (no real FB launch).
- [ ] Infrastructure: tree renders from the 5 ID-addressed tables; Hide/unhide a profile; **skip** Sync (writes to FB-synced fields are fine but pointless on clone).
- [ ] Profile Hub: open, edit a text field, upload an SOP screenshot (attachment merge), verify after reload.
- [ ] Rules page: list/create/edit/delete a Scaling Rule. Schedules page: Tonight + Log tabs; create a scheduled action (auto-links campaign via `{FB Campaign ID}` filter); cancel it.
- [ ] Overview page: Script KPI tab renders with sane numbers (exercises count/lookup derivations hardest).
- [ ] `scripts/contract-test.mjs` full green, run again after the manual session.
- [ ] Playwright: adapt `pw-test.mjs` / `audit_playwright.mjs` to the clone URL if quick; otherwise manual is sufficient.

### Phase 6: Parallel-run → cutover → rollback

**Parallel run (1–2 weeks):** re-run the mirror on demand before each test session (or add a cron Worker invoking the mirror hourly — optional; manual is fine at this scale). Clone writes are disposable and get overwritten by each re-mirror — this is the accepted temporary sync issue, by design.

**Cutover checklist (do in a quiet window, ~30 min):**
- [ ] Announce write-freeze to staff + pause n8n image workflow + skip Claude-skill writes + let the 17:00 UTC executor run finish (or pick a window far from it).
- [ ] Final mirror run; verify counts; `meta.last_mirror` recorded.
- [ ] Flip **live** project: set `DATA_BACKEND=d1` (and confirm the D1 binding is on the live project's `wrangler.toml` deploy). Redeploy live from `d1-shim` (now merged to `main`).
- [ ] Deploy executor live config: `ops-scheduled-executor` with `DATA_BACKEND=d1`, crons restored, DRY_RUN off.
- [ ] Repoint external writers: n8n Airtable node → HTTP node calling `POST /api/airtable/Temp Images` on the dashboard with a service JWT (mint one long-lived token from JWT_SECRET for integrations); Claude skills (`accotta-script-count`, video-data, AI-videos flow) → same endpoint/token; anything found in Step 0.4.
- [ ] Set the Airtable base to read-only (remove write scope from the PAT or just stop using it) — it stays as the pre-cutover archive.
- [ ] Watch `mutations_log` + app for 48h.

**Rollback:** flip `DATA_BACKEND=airtable` back. Airtable still holds pre-cutover state; post-cutover writes are replayable from `mutations_log` (ordered, with payloads) via a small replay script — write it only if rollback is actually needed.

### Phase 7: Post-cutover cleanup (separate PRs, no rush)

- [ ] Delete dormant `/api/d1` branches (`infrastructure/data.ts`, `rules/data.ts`), `provider.ts` D1 stubs, `drizzle-orm`/`drizzle-kit` deps, root zips, `.cleanup/archived/` (keep the docs).
- [ ] Fix the `Launch Date` collision with a real second column + one-line mapper change.
- [ ] Optionally remove the 5 req/s client throttle.
- [ ] Rotate AIRTABLE PAT / FB_APP_SECRET / JWT_SECRET (B16).
- [ ] Decide on Option B (per-table schema) only if/when SQL queryability is actually needed.

---

# Part 5 — Self-review notes & assumptions (read before executing)

1. ~~Assumption~~ **Verified 2026-10-08:** Pages project `ops-dashboard` is on the **Apollo** Cloudflare account (not Accotta as the R2 worker subdomain suggested); live domain app.trustapollo.com; deploys are direct uploads (`wrangler pages deploy dist`), no GitHub integration — so GitHub push access is not required to deploy the clone.
2. **Assumption:** total data volume stays <~10k rows; the load-whole-table shim strategy depends on it. Task 1.4 records real counts — if Videos exceeds ~20k someday, add per-table D1 indexes on commonly filtered JSON fields (D1 supports generated columns) — not needed now.
3. **Assumption:** no Airtable automations drive business logic (none visible in schema, but unverifiable via API) — Step 0.4 is the check.
4. **Decision surfaced, not silently made:** permissions hole fix (Task 2.8) changes live behavior for non-admins on `Profiles` — confirm Profile Hub's intended audience with Jay before enforcing.
5. **Not duplicated on purpose:** R2 bucket, FB app, RedTrack, n8n, AdsPower — shared between prod and clone during the test phase (B10). Duplicating them would multiply work for little test value.
