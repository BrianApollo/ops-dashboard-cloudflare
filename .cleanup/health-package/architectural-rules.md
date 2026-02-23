# Architectural Rules: ops-dashboard-cloudflare

**Date:** February 22, 2026
**Status:** Binding — all new code must comply

These rules are the non-negotiables established after the 2026 cleanup. They prevent the duplication, dead code, and structural confusion that made the pre-cleanup codebase difficult to maintain. Every pull request should be reviewed against this list.

---

## Rule 1: Pages Are Wiring Only

**Location:** `src/pages/`

Pages may:
- Import components from `src/components/`
- Import feature hooks from `src/features/`
- Render layout (tabs, panels, headers)
- Pass data and callbacks from hooks down to components as props
- Have a maximum of 5 `useState` calls

Pages must not:
- Contain business logic (no data transformation, no conditional fetch decisions)
- Call `fetch()` directly
- Import from `src/lib/` directly (only features do that)
- Exceed 5 `useState` declarations (if you need more, extract a hook or sub-component)

**Why:** Pages that mix wiring with logic grow without bound (see CampaignViewPage.tsx at ~1,800 lines as the cautionary example). Keeping pages thin makes routing changes safe and fast.

---

## Rule 2: All Airtable Calls Go Through features/[name]/data.ts

**Location:** `src/features/[feature-name]/data.ts`

All functions that read from or write to Airtable must live in the `data.ts` file of the relevant feature. No component, page, or hook outside of a `data.ts` file may call `/api/airtable/*` directly.

**Correct:**
```typescript
// src/features/campaigns/data.ts
export async function getCampaigns(productId: string): Promise<Campaign[]> {
  const records = await fetchAllAirtableRecords<CampaignFields>('/api/airtable/...');
  return records.map(transformCampaign);
}
```

**Incorrect:**
```typescript
// src/pages/campaigns/CampaignViewPage.tsx  ← WRONG
const res = await fetch('/api/airtable/Campaigns?filterBy=...');
```

**Why:** Centralizing data access in `data.ts` means field names, transformations, and error handling are in one place. If Airtable renames a field, you change one file, not many.

---

## Rule 3: All Pagination Uses fetchAllAirtableRecords()

**Location:** Import from `src/lib/airtable-helpers.ts`

No file may implement its own Airtable pagination loop. All paginated Airtable list requests must use:

```typescript
import { fetchAllAirtableRecords } from '../../lib/airtable-helpers';

const records = await fetchAllAirtableRecords<MyFieldTypes>(url, options);
```

**Why:** Before this rule existed, 11 different pagination loops existed in the codebase. Each had slight differences. One missing `offset` parameter meant silently returning only the first 100 records. The shared helper is tested once and used everywhere.

---

## Rule 4: All Airtable Types Import from lib/airtable-types.ts

**Location:** `src/lib/airtable-types.ts`

No file may define its own `AirtableRecord` or `AirtableResponse` interface. All features must import from the canonical source:

```typescript
import type { AirtableRecord, AirtableResponse } from '../../lib/airtable-types';
```

For typed field access, use the generic parameter:
```typescript
import type { AirtableRecord } from '../../lib/airtable-types';

interface CampaignFields {
  Name: string;
  Status: string;
}

type CampaignRecord = AirtableRecord<CampaignFields>;
```

**Why:** Before this rule, 10 slightly different `AirtableRecord` definitions existed. Some were missing `createdTime`. Some had `fields` typed as `any`. One shared definition keeps types consistent everywhere.

---

## Rule 5: Shared Reference Data Comes from provider.ts Only

**Location:** `src/data/provider.ts`

Products and users are referenced across many features. Their canonical fetch implementations live in `provider.ts`. No feature `data.ts` may implement its own `fetchProducts()` or `fetchUsers()`.

```typescript
// Correct: import from provider
import { fetchProducts, fetchUsers } from '../../data/provider';

// Incorrect: define your own copy
async function fetchProducts() { /* duplicate implementation */ }
```

**Why:** Before this rule, `fetchProducts` was copy-pasted 6 times. A field name change in Airtable would break 6 files. Now it breaks 1.

---

## Rule 6: UI Components Go in components/ (Feature-Specific or Root)

**Location:** `src/components/[feature]/` or `src/components/` root

- Feature-specific components (used only by one feature): `src/components/[feature-name]/`
- Cross-feature components (used by 2+ features): `src/components/` root

Components must not:
- Import directly from `features/` — they receive data as props
- Call `fetch()` directly
- Import `provider.ts` or `lib/` directly

**Why:** If a component fetches its own data, it becomes hard to reuse, test, or render in isolation. Components that only take props are portable and testable.

---

## Rule 7: New Business Logic Goes in features/[name]/

**Location:** `src/features/[feature-name]/`

New hooks, API call functions, data transformers, and business rule logic all go in the relevant feature directory. The typical structure for a new feature:

```
src/features/my-feature/
├── data.ts          ← Airtable fetch functions
├── types.ts         ← TypeScript interfaces for this feature
└── useMyFeatureController.ts  ← React hook (state + data coordination)
```

If a feature needs Facebook API calls, add `api.ts` or `facebook.ts` alongside `data.ts`.

**Why:** Separating logic into features makes it findable. A developer looking for "how does video approval work" looks in `features/videos/` — not across pages, components, and utils.

---

## Rule 8: No Inline Styles — Use Theme Tokens or sx Prop

No component may use:
```tsx
// WRONG: hardcoded color string
<Box style={{ color: '#e53935' }}>
```

Components must use:
```tsx
// Correct: MUI theme token
<Box sx={{ color: 'error.main' }}>

// Correct: theme palette via useTheme
const theme = useTheme();
<Box sx={{ color: theme.palette.error.main }}>

// Correct: named constant from src/ui/colors.ts
import { STATUS_COLORS } from '../../ui/colors';
<Box sx={{ color: STATUS_COLORS.rejected }}>
```

**Why:** Hardcoded color strings break light/dark mode, are not tracked, and create visual inconsistency. Theme tokens and named constants update everywhere at once when the design changes.

---

## Rule 9: Hook Naming Convention

All custom React hooks must follow one of three naming patterns:

| Pattern | When to use | Example |
|---|---|---|
| `use[Entity]Controller` | A hook that fetches data and manages state for a full page or major section | `useCampaignsController`, `useScriptsController` |
| `use[Feature]Orchestrator` | A hook that coordinates a multi-step flow or combines multiple sub-hooks | `useLaunchOrchestrator`, `useAdCreationOrchestrator` |
| `use[Feature]Effect` | A hook that performs a side effect only (e.g., analytics, auto-save) and returns nothing or a cleanup function | `useAutoSaveEffect`, `usePageViewEffect` |

Hooks that are simple wrappers around a single API call (not coordinating state) belong in `data.ts` as plain async functions, not as hooks.

**Why:** With 5 different naming patterns before the cleanup, it was impossible to know what a hook did from its name. The three-suffix system communicates role at a glance.

---

## Rule 10: Build Must Pass Before Any Commit

No code may be committed if `npm run build` fails. This is the minimum quality gate.

Recommended pre-commit checks:
```bash
npx tsc --noEmit   # Type errors only, no build artifacts
npm run build       # Full production build
```

**Why:** TypeScript type errors caught at commit time are free. TypeScript type errors caught in production are expensive. The build taking ~3.3 seconds means there is no excuse for skipping it.

---

## Enforcement

These rules are currently enforced by convention and code review only. Future tooling to consider:

| Rule | Potential Automated Enforcement |
|---|---|
| Rules 2, 3, 4, 5 | ESLint import restrictions (`eslint-plugin-import` with zone rules) |
| Rule 8 | ESLint rule disallowing `style` prop with hardcoded color strings |
| Rule 9 | ESLint custom naming convention rule for hook files |
| Rule 10 | Git pre-commit hook running `tsc --noEmit` |

Until automated enforcement is added, these rules must be checked in code review.
