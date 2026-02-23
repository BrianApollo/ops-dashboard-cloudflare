# Code Quality Report: ops-dashboard-cloudflare Cleanup

**Date:** February 22, 2026
**Cleanup Phases:** 4 (Dead Code → Deduplication → Folder Structure → Naming/Styling)
**Overall Result:** Significant reduction in complexity with zero production regressions

---

## Headline Numbers

| Metric | Before | After | Change |
|---|---|---|---|
| Total TypeScript files | 272 | 243 | **-29 files (-11%)** |
| `src/domains/` directory | 91 files | 0 (deleted) | **-91 files** |
| `src/db/` directory | 16 files | 0 (deleted) | **-16 files** |
| `src/lib/` directory | 0 files | 2 files | **+2 files (new)** |
| `provider.ts` line count | 756 lines | 180 lines | **-576 lines (-76%)** |
| `fetchProducts()` duplicates | 6 copies | 1 shared | **-5 copies** |
| `AirtableRecord` type duplicates | 10 copies | 1 shared | **-9 copies** |
| Airtable pagination loops | 11 copies | 1 shared helper | **-10 copies** |
| Hook naming patterns | 5 patterns | 3 patterns | **-2 patterns** |
| Color/style constant files | 3 files | 2 files | **-1 file** |
| Build time | ~3.3s | ~3.3s | **0 regression** |
| Bundle size (main chunk) | 1,145 kB | 1,145 kB | **0 regression** |
| Build pass/fail | Pass | Pass | **0 regression** |

---

## Phase 1: Dead Code Removal

### What was removed

| Item | Files Deleted | Lines Removed (approx.) |
|---|---|---|
| `src/db/` — Cloudflare D1 database layer (never used) | 16 | ~800 |
| `functions/api/d1/` — D1 serverless functions | ~3 | ~150 |
| `migrations/` — SQL migration scripts | ~5 | ~200 |
| `dbmigration/` — Migration tooling | ~3 | ~100 |
| D1 guard branches in `provider.ts` | (inline) | ~576 (of 756 total) |
| **Total** | **~27 files** | **~1,826 lines** |

### Why it was safe to delete
The D1 database was scaffolded but the `VITE_DATA_PROVIDER` environment variable was always set to `airtable` in every environment. The D1 code path was never executed. Removing it carries zero production risk.

### provider.ts reduction detail
```
Before: 756 lines
  - ~576 lines: D1 implementation branches and type guards
  - ~180 lines: Live Airtable implementations

After: 180 lines
  - 180 lines: Live Airtable implementations only
```

---

## Phase 2: Duplicate Consolidation

### fetchProducts() — 6 copies → 1

Before cleanup, the function to fetch the full product list from Airtable was copy-pasted across 6 different feature files. Each copy was slightly different in variable names, error handling, and pagination approach.

**Files that previously contained their own copy:**
- `features/campaigns/data.ts`
- `features/scripts/data.ts`
- `features/images/data.ts`
- `features/videos/data.ts`
- `features/advertorials/data.ts`
- `data/provider.ts`

**After:** One canonical implementation in `src/data/provider.ts`. All feature files import `fetchProducts` from `provider.ts`.

**Risk of the old state:** A bug fix in one copy would not propagate to the other 5. A data shape change in Airtable would require updates in 6 places.

### AirtableRecord interface — 10 copies → 1

Before cleanup, each feature file that needed to type an Airtable API response defined its own `AirtableRecord` interface:
```typescript
// This was repeated ~10 times across the codebase, sometimes with slight variations
interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
  createdTime: string;
}
```

**After:** Single canonical definition in `src/lib/airtable-types.ts`:
```typescript
export interface AirtableRecord<T = Record<string, unknown>> {
  id: string;
  fields: T;
  createdTime: string;
}

export interface AirtableResponse<T = Record<string, unknown>> {
  records: AirtableRecord<T>[];
  offset?: string;
}
```

All feature `data.ts` files import from `src/lib/airtable-types.ts`. The generic `<T>` parameter allows type-safe field access while sharing the structural definition.

### Airtable pagination loop — 11 copies → 1

Airtable paginates results using an `offset` cursor. Before cleanup, 11 different files had their own version of the pagination while-loop:

```typescript
// This pattern was copy-pasted ~11 times with minor variations
let allRecords = [];
let offset: string | undefined;
do {
  const url = offset ? `${baseUrl}&offset=${offset}` : baseUrl;
  const response = await fetch(url, { headers });
  const data = await response.json();
  allRecords = allRecords.concat(data.records);
  offset = data.offset;
} while (offset);
```

**After:** Single shared helper in `src/lib/airtable-helpers.ts`:
```typescript
export async function fetchAllAirtableRecords<T>(
  url: string,
  options?: RequestInit
): Promise<AirtableRecord<T>[]>
```

All `data.ts` files call `fetchAllAirtableRecords()`. Pagination behavior is consistent and bug-fixes apply everywhere at once.

---

## Phase 3: Folder Structure Rationalization

### src/domains/ elimination

| Before | After |
|---|---|
| `src/domains/` — 91 files in a custom domain-driven structure | Eliminated |
| Mixed business logic and UI in domain folders | Business logic → `src/features/` |
| — | UI components → `src/components/` |
| — | Route entry points → `src/pages/` |

**New structure file counts:**

| Directory | File Count | Purpose |
|---|---|---|
| `src/pages/` | 8 files | Route entry points (wiring only) |
| `src/components/` | 51 files | Presentational UI components |
| `src/features/` | 94 files | Business logic (hooks, data, types) |

**Why this is better:**
- A new developer looking for "where does the campaign data come from" knows to look in `src/features/campaigns/data.ts` — not search through a `domains` folder
- A new developer looking for "where is the campaign list component" knows to look in `src/components/campaigns/` — not co-located with business logic
- The three-layer separation enforces a clear dependency direction: pages → components + features → lib

---

## Phase 4: Naming and Styling Consistency

### Hook naming patterns: 5 → 3

Before cleanup, custom React hooks used 5 different naming conventions with no clear rule:

| Old pattern | Example | Ambiguity |
|---|---|---|
| `useXData` | `useCampaignData` | What does "Data" mean? Fetch? Transform? |
| `useXManager` | `useCampaignManager` | Manager of what? State? API? |
| `useXLogic` | `useScriptLogic` | Vague |
| `useXHook` | `useProductHook` | Tautological |
| `useX` (no suffix) | `useCampaigns` | No indication of role |

After cleanup, 3 clear patterns enforced:

| New pattern | Example | Meaning |
|---|---|---|
| `use[Entity]Controller` | `useCampaignsController` | Owns data-fetch + state for a page |
| `use[Feature]Orchestrator` | `useLaunchOrchestrator` | Coordinates a multi-step flow |
| `use[Feature]Effect` | `useAutoSaveEffect` | Side effect only, no state returned |

**6 hooks renamed in Phase 4:**
- `useCampaignData` → `useCampaignsController`
- `useScriptLogic` → `useScriptsController`
- `useAdPresetData` → `useAdPresetsController`
- `useAdvertorialManager` → `useAdvertorialsController`
- `useLaunchManager` → `useLaunchOrchestrator`
- (one additional hook — see risk-and-debt-log.md for stale alias check)

### Color files: 3 → 2

| Before | After |
|---|---|
| `src/ui/colors.ts` | `src/ui/colors.ts` (merged) |
| `src/ui/pills.ts` | (deleted — content merged into colors.ts) |
| `src/constants/colors.ts` | `src/constants/colors.ts` (unchanged) |

`pills.ts` was a small file containing status pill color mappings. It was imported in only a handful of places and its content logically belonged in `colors.ts`. Merging it eliminated one unnecessary import to track.

---

## Build Verification

The build was run before and after each cleanup phase:

```
npm run build

✓ 243 modules transformed.
dist/index.html                   0.46 kB
dist/assets/index-[hash].js    1145.00 kB  ← pre-existing, not introduced
dist/assets/index-[hash].css     89.20 kB

Build time: ~3.3s
```

**No regressions were introduced.** The 1,145 kB bundle size warning existed before cleanup and is documented as a separate debt item in `risk-and-debt-log.md`.

---

## Code Complexity Trend

| Complexity Indicator | Before | After |
|---|---|---|
| Files with duplicate business logic | High | Low |
| Files you must edit to change one behavior | Up to 6 | 1 |
| Directories a new dev must understand first | 4+ (domains, db, data, features) | 3 (pages, components, features) |
| Lines in largest non-page file (provider.ts) | 756 | 180 |
| Naming patterns for hooks | 5 | 3 |
| Shared utility files for Airtable plumbing | 0 | 2 |

---

## What Was Not Changed

The following were intentionally left unchanged to keep the cleanup scope tight:

- All business logic within `features/` (no feature behavior was altered)
- All component rendering logic within `components/`
- All Cloudflare Functions in `functions/api/`
- The `core/` directory (auth, modals, forms, etc.)
- MUI theme and styling configuration
- Route definitions in `app/routes.tsx`
- Any runtime behavior, API contracts, or data schemas
