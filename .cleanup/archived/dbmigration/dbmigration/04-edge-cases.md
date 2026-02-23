# Edge Cases — Airtable Behaviors That Need Special SQL Handling

These are the things that typically break migrations. Every item here has a concrete resolution.

---

## 1. LINKED RECORDS → Junction Tables

Airtable returns linked fields as arrays of record IDs: `["recA123", "recB234"]`
In SQL these become proper relational joins.

### Infrastructure (many-to-many)

| Field | Airtable | SQL Replacement |
|---|---|---|
| `Linked BM` on Profile | `string[]` of BM record IDs | `profile_bms(profile_id, bm_id)` junction |
| `Linked Pages` on Profile | `string[]` of Page record IDs | `profile_pages(profile_id, page_id)` junction |
| `Linked Profile` on BM | `string[]` of Profile record IDs | Same `profile_bms` junction (other direction) |
| `Linked Ad Accs` on BM | `string[]` of AdAccount record IDs | `bm_ad_accounts(bm_id, ad_account_id)` junction |
| `Linked Pixels` on BM | `string[]` of Pixel record IDs | `bm_pixels(bm_id, pixel_id)` junction |
| `Owned Pixels` on BM | `string[]` of Pixel record IDs | `pixel_owner_bms(pixel_id, bm_id)` junction |
| `Linked BM` on AdAccount | `string[]` of BM record IDs | Same `bm_ad_accounts` junction |
| `Linked Profiles` on Page | `string[]` of Profile record IDs | Same `profile_pages` junction |
| `Linked BMs` on Pixel | `string[]` of BM record IDs | Same `bm_pixels` junction |
| `Owner BM` on Pixel | `string[]` of BM record IDs | Same `pixel_owner_bms` junction |

**Write handling:** When syncing infrastructure from Facebook API, use INSERT OR REPLACE (UPSERT) on junction tables. Delete removed associations first.

### Content (single FK — Airtable arrays contain exactly 1 item)

| Field | Airtable | SQL Replacement |
|---|---|---|
| `Editor` on Video | `[recXXX]` (1-item array) | `editor_id TEXT FK→users` |
| `Product` on Video | `[recXXX]` (1-item array) | `product_id TEXT FK→products` |
| `Script` on Video | `[recXXX]` (1-item array) | `script_id TEXT FK→video_scripts` |
| `Product` on Script | `[recXXX]` (1-item array) | `product_id TEXT FK→products` |
| `Author` on Script | `[recXXX]` (1-item array) | `author_id TEXT FK→users` |
| `Product` on Advertorial | `[recXXX]` (1-item array) | `product_id TEXT FK→products` |
| `Product` on AdPreset | `[recXXX]` (1-item array) | `product_id TEXT FK→products` |
| `Product` on Campaign | `[recXXX]` (1-item array) | `product_id TEXT FK→products` |
| `Selected Ad Profile` on Campaign | `[recXXX]` (1-item array) | `selected_ad_profile_id FK→ad_presets` |

### Content (many-to-many junction)

| Field | SQL Replacement |
|---|---|
| `Videos Used In This Campaign` | `campaign_videos(campaign_id, video_id)` |
| `Images Used In This Campaign` | `campaign_images(campaign_id, image_id)` |
| `Used In Campaign` on Video | Same `campaign_videos` (other direction) |
| `Used In Campaigns` on Image | Same `campaign_images` (other direction) |

---

## 2. FORMULA / COMPUTED FIELDS — Do NOT Store

These are calculated by Airtable and must NOT be migrated as stored data.

| Field | Airtable Behavior | SQL Handling |
|---|---|---|
| `Token Valid` | Appears to be stored but is really updated by the app after validation | Store in SQL as `token_valid BOOLEAN`, but always recompute on token validation — never trust the stored value |
| `Last Upload At` on Videos | Airtable "Last modified time" auto-field | Replace with `updated_at TIMESTAMP` auto-managed by SQL trigger or app |
| `Script Content (from Script)` on Videos | Airtable lookup field (read-only) | Compute via SQL JOIN: `SELECT v.*, s.script_content FROM videos v LEFT JOIN video_scripts s ON v.script_id = s.id` |

**Critical:** Writing to `Last Upload At` causes a 422 error from Airtable. In D1 this field simply doesn't exist — use `updated_at`.

---

## 3. ATTACHMENT FIELDS → `product_assets` Table

Airtable returns attachments as objects:
```json
{ "id": "attXXX", "url": "https://airtable.com/...", "filename": "image.png", "size": 102400 }
```

These are NOT stored as URLs in our DB — they are Airtable CDN URLs that expire.

**Migration plan:**
- At migration time: download each attachment and re-upload to Cloudflare R2 (or Google Drive)
- Store the new permanent URL in `product_assets.url`
- The `id` field becomes the PK in `product_assets`

**product_assets table:**
```sql
id          TEXT PRIMARY KEY,   -- Airtable attachment ID (preserved during migration)
product_id  TEXT NOT NULL,
url         TEXT NOT NULL,       -- Permanent URL (R2 or Drive)
filename    TEXT NOT NULL,
type        TEXT NOT NULL,       -- 'image' or 'logo'
sort_order  INTEGER DEFAULT 0,
created_at  TEXT DEFAULT CURRENT_TIMESTAMP
```

---

## 4. filterByFormula → SQL WHERE Clauses

The Airtable proxy passes `filterByFormula` through to Airtable. Each use must be replaced.

| Location | Airtable Formula | SQL WHERE Equivalent |
|---|---|---|
| `ad-presets/data.ts` | `FIND("${productId}", ARRAYJOIN({Product}))` | `WHERE product_id = ?` |
| `videos/data.ts` | `({Role} = 'Video Editor')` on Users table | `WHERE role = 'Video Editor'` |
| `campaigns/data.ts` | Filter by product + status | `WHERE product_id = ? AND status = ?` |
| `images/data.ts` | Filter by product | `WHERE product_id = ?` |
| `scripts/data.ts` | Filter by product/author | `WHERE product_id = ?` |
| `profiles/data.ts` | Filter profiles | Standard WHERE |

**Action:** When replacing each data-fetching function, find the `filterByFormula` call and convert to a `WHERE` clause in the Drizzle query.

---

## 5. Server-Side Sorting → SQL ORDER BY

| Location | Airtable Sort | SQL Equivalent |
|---|---|---|
| `scaling_rules/data.ts` | `sort[0][field]=Name, sort[0][direction]=asc` | `ORDER BY name ASC` |

All other tables sort client-side after fetch. No additional changes needed.

---

## 6. Pagination → SQL LIMIT / OFFSET

Airtable uses `offset` token (opaque string) for cursor pagination.
SQL uses numeric `LIMIT` and `OFFSET`.

Current pattern:
```ts
do {
  const url = offset ? `${TABLE}?offset=${offset}` : TABLE;
  const data = await airtableFetch(url);
  allRecords.push(...data.records);
  offset = data.offset;  // next page token or undefined
} while (offset);
```

D1 replacement:
```ts
let offset = 0;
const pageSize = 100;
do {
  const rows = await db.select().from(table).limit(pageSize).offset(offset);
  allRecords.push(...rows);
  offset += rows.length;
} while (allRecords.length % pageSize === 0 && allRecords.length > 0);
```

Most tables are small enough that a single query suffices — only needed for large tables (Videos, Images, Campaigns).

---

## 7. Status Normalization — Must Keep Working

The app normalizes status values between Airtable display names and domain values.
After migration, store the **normalized domain value** in D1 — not the Airtable display name.

| Feature | Airtable Value | Domain Value | Store in D1 |
|---|---|---|---|
| Videos | "To Do" | "todo" | `"todo"` |
| Videos | "Review" | "review" | `"review"` |
| Videos | "Available" | "available" | `"available"` |
| Videos | "Used" | "used" | `"used"` |
| Videos | "Square" | "square" | `"square"` |
| Videos | "Vertical" | "vertical" | `"vertical"` |
| Videos | "YouTube" | "youtube" | `"youtube"` |
| Campaigns | "Preparing" | "Preparing" | `"Preparing"` *(no change)* |
| Products | "Active" | "Active" | `"Active"` *(no change)* |

**Action:** At migration time, convert all Airtable values to domain values. The mapper functions already do this — run them during the data import script.

**Critical:** Remove denormalization code that converts domain values back to Airtable strings before writing (`"todo"` → `"To Do"`). In D1 you write the normalized value directly.

---

## 8. Boolean/Checkbox Fields — SQLite INTEGER

SQLite has no native BOOLEAN type. Use INTEGER (0/1).

| Field | Airtable | D1 | Code |
|---|---|---|---|
| `hidden` | `true\|false\|undefined` | `INTEGER DEFAULT 0` | `hidden ?? false` |
| `token_valid` | `true\|false` | `INTEGER DEFAULT 0` | `tokenValid ? 1 : 0` |
| `reuse_creatives` | `true\|false\|undefined` | `INTEGER` nullable | `reuseCreatives ?? null` |
| `launch_as_active` | `true\|false\|undefined` | `INTEGER` nullable | `launchAsActive ?? null` |
| `is_approved` | `true\|false` | `INTEGER DEFAULT 0` | `isApproved ? 1 : 0` |
| `needs_revision` | `true\|false` | `INTEGER DEFAULT 0` | same |
| `is_checked` | `true\|false` | `INTEGER DEFAULT 0` | same |

Drizzle maps `INTEGER` → TypeScript `boolean` automatically with `.notNull().default(false)`.

---

## 9. Lookup Fields → JOINs

Airtable lookup fields (read-only, returns data from a linked record) must become SQL JOINs.

| Lookup Field | Airtable Behavior | SQL Query |
|---|---|---|
| `Script Content (from Script)` on Videos | Returns Script's content via linked Script record | `LEFT JOIN video_scripts vs ON v.script_id = vs.id` → use `vs.script_content` |

The current code handles this: `fields[FIELD_SCRIPT_CONTENT]` returns an array, takes first element. In D1, `vs.script_content` is a plain string — simplifies the code.

---

## 10. `createdTime` Auto-Field

Every Airtable record has a `createdTime` field (ISO datetime). Map to `created_at` column in SQL with `DEFAULT CURRENT_TIMESTAMP`.

At migration time, preserve the Airtable `createdTime` values by explicitly inserting them.

---

## 11. Sensitive Field Stripping

The current Cloudflare Worker (`functions/api/airtable/[[path]].ts`) strips sensitive fields from responses based on user role.

In the D1 layer, implement this in the query functions:
```ts
// In src/db/queries/profiles.ts
export async function getProfiles(db: D1Database, user: User): Promise<InfraProfile[]> {
  const rows = await drizzle(db).select().from(profiles);
  if (user.role !== 'admin') {
    return rows.map(r => omit(r, SENSITIVE_PROFILE_FIELDS));
  }
  return rows;
}
```

Sensitive fields list (from current permissions.ts):
- profiles: `permanent_token`, `profile_fb_password`, `profile_email_password`, `profile_2fa`, `profile_security_email`, `security_email_password`
- business_managers: `system_user_token`, `system_user_id`
- users: `password_hash`

---

## 12. Master Profile Table

The Airtable `Master Profile` table stores a single record pointing to the "master" profile record ID.

**SQL replacement:** Add `is_master BOOLEAN DEFAULT 0` column to `profiles` table. Query: `SELECT * FROM profiles WHERE is_master = 1 LIMIT 1`.

At migration time, query the Master Profile Airtable table to find which profile record is the master, then set `is_master = 1` on that row.

---

## 13. Temp Images Table

`Temp Images` is a staging area — images that exist temporarily before being promoted to `Images`.

**SQL replacement:** Add `is_temp BOOLEAN DEFAULT 0` column to `images` table. OR keep the separate `temp_images` table as-is (simpler, maps 1:1 to Airtable).

Recommendation: Keep `temp_images` as a separate table to avoid complicating the main `images` queries.
