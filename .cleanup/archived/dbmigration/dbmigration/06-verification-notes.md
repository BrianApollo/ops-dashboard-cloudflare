# Cross-Verification Notes

Cross-verification agent ran against schema + codebase. 96% aligned.
Key findings below — most are issues in the CURRENT Airtable code that D1 actually fixes.

---

## CRITICAL (2) — Both FIXED by the D1 migration itself

### 1. Campaign `launch_date` vs `launched_at` Field Collision in Airtable
**Current problem:** In `src/features/campaigns/data.ts`, two constants both map to the Airtable string `'Launch Date'`:
- `FIELD_LAUNCH_DATE = 'Launch Date'` — the planned launch date (draft field)
- `FIELD_LAUNCHED_AT = 'Launch Date'` — the actual launch timestamp (post-launch)

This means in Airtable, writing either one overwrites the other. This is a bug in the current code.

**D1 fix:** The schema has two separate columns:
- `launch_date TEXT` — draft planned date
- `launched_at TEXT` — actual launch timestamp

When implementing the D1 query layer, map `FIELD_LAUNCH_DATE` → `launch_date` and `FIELD_LAUNCHED_AT` → `launched_at` (two different columns). The collision is resolved.

**Action during migration:** Check if Airtable data has any ambiguity in the `Launch Date` field, and set values appropriately in both new columns.

---

### 2. Video `FIELD_USED_IN_CAMPAIGN` Should Use Junction Table
**Current behavior:** Airtable stores this as a linked record array on the video record: `FIELD_USED_IN_CAMPAIGN = 'Used In Campaign'`.

**D1 architecture:** There is no `used_in_campaign` column on the `videos` table. Instead, use the `campaign_videos` junction table.

**What this means in code:** When `updateVideoUsage()` in `videos/data.ts` currently writes `FIELD_USED_IN_CAMPAIGN` to the video record, the D1 version should instead INSERT into `campaign_videos(campaign_id, video_id)`.

**Action during implementation:** Rewrite `updateVideoUsage()` to:
1. INSERT rows into `campaign_videos` for new associations
2. DELETE rows from `campaign_videos` for removed associations
3. No longer PATCH the video record directly

---

## MINOR (3)

### 3. ImageStatus type needs to include 'new'
**Finding:** The mapper in `src/features/images/data.ts` assigns `status = 'new'` for temp images, but the TypeScript `ImageStatus` type may not include `'new'` as a value.

**Action:** Verify the `ImageStatus` type definition includes `'new'` before implementation. If not, add it.

---

### 4. No Dedicated Data Files for `users` and `scaling_rules`
**Finding:** The `users` table (used for auth + editor lookups) and `scaling_rules` table don't have a matching entry in `03-write-operations.md` because they're currently read-only in code.

**Action:** Create `src/db/queries/users.ts` and `src/db/queries/scaling_rules.ts` with at minimum `getAll()` and `getById()` functions. The auth system will also need `getUserByEmail()` and `verifyPassword()`.

---

### 5. Temp Images Rarely Used
**Finding:** The `temp_images` table is a staging area used in limited places. It's correctly defined in the schema as a separate table.

**No action needed** — schema is correct.

---

## All-Clear Tables (Verified ✓)

| Table | Status |
|---|---|
| profiles | ✅ All 23 fields verified |
| business_managers | ✅ All 9 fields verified |
| ad_accounts | ✅ All 8 fields verified |
| pages | ✅ All 8 fields verified |
| pixels | ✅ All 8 fields verified |
| video_scripts | ✅ All hook fields present |
| videos | ✅ Schema correct (junction handles campaign link) |
| campaigns | ✅ Separate columns fix the Airtable collision |
| images | ✅ All fields including count |
| ad_presets | ✅ All 16 copy fields + 3 compliance fields |
| advertorials | ✅ All fields |
| products | ✅ All fields + product_assets table |
| All 8 junction tables | ✅ Correctly defined |
