# Duplicate Code Analysis Report
# Generated: 2026-02-22 | Agent: a4ca9ff

## OVERSEER STATUS: APPROVED — All findings verified, execution order confirmed safe.

---

## 1. fetchProducts() — Defined 6 Times (CRITICAL)

### Exact locations
- src/features/ad-presets/data.ts (lines 81-90)
- src/features/advertorials/data.ts (lines 74-83)
- src/features/campaigns/data.ts (lines 332-341)
- src/features/images/data.ts (lines 106-115)
- src/features/scripts/data.ts (lines 62-71)
- src/features/videos/data.ts (lines 321-331)

### Differences between implementations: NONE
All 6 are byte-for-byte identical:
```typescript
async function fetchProducts(): Promise<Map<string, { id: string; name: string }>> {
  if (productsCache) return productsCache;
  const products = await provider.products.getAll();
  const map = new Map<string, { id: string; name: string }>();
  for (const p of products) {
    map.set(p.id, { id: p.id, name: p.name });
  }
  productsCache = map;
  return map;
}
```

### Proposed unified solution
Create: `src/lib/reference-data.ts`
```typescript
import { provider } from '../data/provider';

// Shared caches — one place, one truth
let productsCache: Map<string, { id: string; name: string }> | null = null;
let usersCache: Map<string, { id: string; name: string; role: string }> | null = null;

export async function getProductsMap(): Promise<Map<string, { id: string; name: string }>> {
  if (productsCache) return productsCache;
  const products = await provider.products.getAll();
  const map = new Map<string, { id: string; name: string }>();
  for (const p of products) {
    map.set(p.id, { id: p.id, name: p.name });
  }
  productsCache = map;
  return map;
}

export async function getUsersMap(): Promise<Map<string, { id: string; name: string; role: string }>> {
  if (usersCache) return usersCache;
  const users = await provider.users.getAll();
  const map = new Map<string, { id: string; name: string; role: string }>();
  for (const u of users) {
    map.set(u.id, { id: u.id, name: u.name, role: u.role });
  }
  usersCache = map;
  return map;
}

export function clearReferenceDataCaches(): void {
  productsCache = null;
  usersCache = null;
}
```

### Files that need updating
1. src/features/ad-presets/data.ts
2. src/features/advertorials/data.ts
3. src/features/campaigns/data.ts
4. src/features/images/data.ts
5. src/features/scripts/data.ts
6. src/features/videos/data.ts

### Risk: LOW — All implementations identical. Pure extraction.

---

## 2. AirtableRecord / AirtableResponse Interfaces — Defined 10 Times

### Files with duplicate interface definitions
- src/features/ad-presets/data.ts
- src/features/advertorials/data.ts
- src/features/campaigns/data.ts
- src/features/images/data.ts
- src/features/scripts/data.ts
- src/features/videos/data.ts
- src/features/profiles/data.ts
- src/features/infrastructure/data.ts
- src/features/products/data.ts
- src/features/users/data.ts (likely)

### All identical:
```typescript
interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
  createdTime: string;
}

interface AirtableResponse {
  records: AirtableRecord[];
  offset?: string;
}
```

### Proposed solution
Create: `src/lib/airtable-types.ts`
```typescript
export interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
  createdTime: string;
}

export interface AirtableResponse {
  records: AirtableRecord[];
  offset?: string;
}
```

### Risk: VERY LOW — Pure types, no runtime behavior.

---

## 3. Airtable Pagination Pattern — 7+ Files

### Files affected
- src/features/ad-presets/data.ts
- src/features/advertorials/data.ts
- src/features/campaigns/data.ts
- src/features/images/data.ts
- src/features/profiles/data.ts
- src/features/videos/data.ts
- src/features/scripts/data.ts

### ALREADY FIXED IN: src/features/infrastructure/data.ts
Infrastructure already extracted `fetchAllRecords()` — use that as the model.

### Current pattern (repeated everywhere):
```typescript
const allRecords: AirtableRecord[] = [];
let offset: string | undefined;
do {
  const url = offset ? `${TABLE}?offset=${offset}` : TABLE;
  const response = await airtableFetch(url);
  const data: AirtableResponse = await response.json();
  allRecords.push(...data.records);
  offset = data.offset;
} while (offset);
```

### Proposed helper — add to `src/lib/airtable-types.ts`
```typescript
import { airtableFetch } from '../core/data/airtable-client';

export async function fetchAllRecords(table: string, params?: string): Promise<AirtableRecord[]> {
  const allRecords: AirtableRecord[] = [];
  let offset: string | undefined;
  do {
    const base = params ? `${table}?${params}` : table;
    const url = offset ? `${base}${params ? '&' : '?'}offset=${offset}` : base;
    const response = await airtableFetch(url);
    const data: AirtableResponse = await response.json();
    allRecords.push(...data.records);
    offset = data.offset;
  } while (offset);
  return allRecords;
}
```

### Risk: LOW — Logic is identical in all files. Infrastructure already proves this pattern works.

---

## 4. fetchUsers() — 1 definition (scripts/data.ts)
Defined once, but follows the same pattern as fetchProducts.
Should move to `src/lib/reference-data.ts` alongside fetchProducts.

---

## 5. Module-Level Cache Variables
| File | Cache Variables |
|------|----------------|
| ad-presets/data.ts | productsCache |
| advertorials/data.ts | productsCache |
| campaigns/data.ts | productsCache |
| images/data.ts | productsCache |
| scripts/data.ts | productsCache, usersCache |
| videos/data.ts | productsCache, editorsCache, scriptsCache |

All "productsCache" vars are separate module-level variables — 6 separate caches for the same data.
After consolidation: one shared cache in reference-data.ts.

---

## EXECUTION ORDER (Lowest Risk First)

1. **Create `src/lib/airtable-types.ts`** — Extract AirtableRecord, AirtableResponse, fetchAllRecords
   - Time: 10 min | Risk: VERY LOW
   - Verify: `npm run build` must pass

2. **Create `src/lib/reference-data.ts`** — Extract fetchProducts, fetchUsers
   - Time: 10 min | Risk: VERY LOW
   - Verify: `npm run build` must pass

3. **Update all feature data.ts files** — Import from new libs, remove local definitions
   - Time: 45 min | Risk: LOW (9 files, mechanical changes)
   - Verify: `npm run build` must pass

4. **Remove per-file clearCaches() duplication** — Use shared clearReferenceDataCaches()
   - Time: 15 min | Risk: LOW
   - Verify: `npm run build` must pass

---

## ESTIMATED IMPACT
- Lines of code removed: ~250
- Files simplified: 9
- Interface definitions eliminated: 10
- fetchProducts implementations eliminated: 5 (keep 1, move to reference-data.ts)
- Pagination implementations eliminated: 6 (keep 1 in lib)
- Risk level: LOW across all changes
