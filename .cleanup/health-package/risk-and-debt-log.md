# Risk and Technical Debt Log: ops-dashboard-cloudflare

**Date:** February 22, 2026
**Risk Levels:** Low = monitor | Medium = schedule soon | High = block on this

---

## Summary Table

| # | Risk / Debt Item | Risk Level | Estimated Effort |
|---|---|---|---|
| 1 | CampaignViewPage.tsx monolith (~1,800 lines) | Medium | 3–5 days |
| 2 | Bundle size 1,145 kB (no code splitting) | Medium | 2–3 days |
| 3 | Modal system partially migrated | Low | 2–3 days |
| 4 | provider.ts empty stubs (scripts, videos, campaigns, images) | Low | 1 day |
| 5 | 6 renamed hooks may have stale import aliases | Low | 2–4 hours |
| 6 | ForbiddenPage.tsx possibly unused | Low | 1 hour |
| 7 | Facebook API version pinning | Medium | 1 day (monitoring) |
| 8 | No automated tests | High | Ongoing / significant investment |
| 9 | Single Airtable API key (no per-user auth) | Medium | Architecture decision required |
| 10 | CampaignViewPage.tsx has 11 useState calls | Medium | Part of item #1 |

---

## Detailed Entries

---

### 1. CampaignViewPage.tsx Monolith

**Description:**
`src/pages/campaigns/CampaignViewPage.tsx` is approximately 1,800 lines long and manages 11 separate `useState` variables. It handles campaign detail display, tab navigation, edit flows, and approval states all in a single file. This violates the architectural rule that pages are wiring only.

**Risk Level:** Medium

**Impact:**
- Hard to read and navigate
- State mutations interact in non-obvious ways
- Adding new campaign features risks introducing regressions
- Slows onboarding for new developers

**Recommended Mitigation:**
Extract each tab into its own sub-component (e.g., `CampaignAdsTab.tsx`, `CampaignDetailsTab.tsx`). Each sub-component should own its local state. The page file should be reduced to routing/layout wiring under 200 lines.

**Estimated Effort:** 3–5 days

---

### 2. Bundle Size: 1,145 kB Main Chunk

**Description:**
The production build emits a single JavaScript chunk of approximately 1,145 kB. Vite warns on this during build. This was a pre-existing condition and was not introduced by the cleanup. The primary causes are likely MUI (Material UI) being imported as a whole, Facebook SDK or similar large dependencies, and the absence of lazy-loading for routes.

**Risk Level:** Medium

**Impact:**
- Slow initial page load, especially on mobile or slow connections
- Entire app logic must download before any page renders
- Worsens as the app grows

**Recommended Mitigation:**
1. Add `React.lazy()` + `Suspense` for each page route in `src/app/routes.tsx`
2. Use Vite's `manualChunks` to split MUI, Facebook SDK, and vendor libs into separate chunks
3. Audit MUI imports — import from `@mui/material/Button` (specific) not `@mui/material` (barrel)

**Estimated Effort:** 2–3 days

---

### 3. Modal System Partially Migrated

**Description:**
`src/core/modals/ModalProvider.tsx` exists as a centralized modal state manager, but the majority of modals across the app still use inline `useState` (`const [open, setOpen] = useState(false)`) inside their parent components. This was an intentional partial migration — the infrastructure was built but the migration of existing modals was deferred.

**Risk Level:** Low

**Impact:**
- Modal open/close state is scattered — hard to know which modals can be open simultaneously
- No protection against multiple modals open at once
- Inconsistent pattern makes the codebase slightly harder to navigate

**Recommended Mitigation:**
Migrate remaining modals to use `ModalProvider` one feature at a time. Start with the most frequently edited feature (campaigns).

**Estimated Effort:** 2–3 days

---

### 4. provider.ts Empty Stubs

**Description:**
`src/data/provider.ts` (now 180 lines) still contains empty or stub implementations for scripts, videos, campaigns, and images data functions. These stubs exist because those features previously had conditional D1/Airtable branches. The D1 branches were removed but the stub function signatures remain. The actual implementations live in each feature's own `data.ts` file.

**Risk Level:** Low

**Impact:**
- Dead code in provider.ts causes minor confusion
- If a future developer imports from provider.ts for these features, they get empty stubs instead of real implementations

**Recommended Mitigation:**
Audit which files import scripts/videos/campaigns/images from `provider.ts`. If none do, delete the stubs. If some do, redirect those imports to the appropriate `features/[name]/data.ts`.

**Estimated Effort:** 1 day

---

### 5. 6 Renamed Hooks with Potentially Stale Import Aliases

**Description:**
During Phase 4 of the cleanup, 6 hooks were renamed to follow the consistent `Controller`/`Orchestrator`/`Effect` naming convention. The build passes (TypeScript resolves the new names correctly), but IDE tools (VS Code, WebStorm) may still show stale references if callers were updated to use the new names but import caches were not refreshed.

**Risk Level:** Low

**Impact:**
- IDE "go to definition" or "find all references" may return incorrect results
- No runtime impact — build output is correct

**Recommended Mitigation:**
Do a codebase-wide search for the 6 old hook names and confirm no file is still importing them under the old name. Run a clean `tsc --noEmit` check. Update any IDE indexes.

**Estimated Effort:** 2–4 hours

---

### 6. ForbiddenPage.tsx May Be Unused

**Description:**
`src/_unbound/ForbiddenPage.tsx` exists in an `_unbound` directory (the convention used for files that have not yet been categorized or may be legacy). It is unclear whether this component is referenced anywhere in the route configuration or permission guards.

**Risk Level:** Low

**Impact:**
- Dead code if unused — minor noise
- If it is used and was missed during cleanup, removing it would break a route

**Recommended Mitigation:**
Run a codebase search for `ForbiddenPage` imports. If no imports are found outside the file itself, delete it. If imports exist, move it to `src/core/permissions/` or `src/pages/`.

**Estimated Effort:** 1 hour

---

### 7. Facebook Graph API Version Pinning

**Description:**
The app integrates heavily with the Facebook Graph API for campaign management, ad creation, and token management. Facebook depreciates API versions on a rolling 2-year schedule. If the pinned API version in `functions/api/facebook/[[route]].ts` or in `features/campaigns/facebook/` is not kept current, API calls will begin failing silently or returning errors.

**Risk Level:** Medium

**Impact:**
- Campaign launch and ad management could break with no code change on our side
- Facebook deprecation notices are sent by email to the app's developer account

**Recommended Mitigation:**
1. Document the current Facebook Graph API version in use
2. Set a calendar reminder to check Facebook's deprecation schedule quarterly
3. Add error handling in the Facebook proxy function that logs the API version in use on each request

**Estimated Effort:** 1 day (to document and add monitoring)

---

### 8. No Automated Tests

**Description:**
The codebase has no unit tests, integration tests, or end-to-end tests. All quality assurance is manual. The build passing (`npm run build`) is the only automated quality gate.

**Risk Level:** High

**Impact:**
- Regressions are not caught until a human tests the affected flow
- Refactoring (such as the CampaignViewPage.tsx work above) carries higher risk without tests as a safety net
- New developers cannot validate their changes automatically

**Recommended Mitigation:**
1. Start with integration tests for the most critical flow: campaign launch (uses Facebook API + Airtable + multi-step state)
2. Add Vitest for unit testing data transformation functions in `features/*/data.ts`
3. Consider Playwright for end-to-end smoke tests on login and the products page

**Estimated Effort:** Ongoing; initial setup ~1 week, full coverage is a multi-sprint investment

---

### 9. Single Airtable API Key (No Per-User Auth to Database)

**Description:**
All Airtable requests are proxied through Cloudflare functions using a single shared `AIRTABLE_API_KEY`. There is no per-user database permission layer — all authenticated users of the app have the same level of Airtable access (mediated only by application-level permission checks in `core/permissions/`).

**Risk Level:** Medium

**Impact:**
- If application permission checks have a bug, a user could read or write data they shouldn't
- Airtable audit logs show a single API key, not individual users
- No database-level row security

**Recommended Mitigation:**
This is an architectural constraint of using Airtable as a backend. Short-term mitigation: ensure application-level permission checks in `core/permissions/` are thorough and unit-tested. Long-term: if stricter data isolation is needed, evaluate moving to a backend with per-user auth (e.g., Postgres via Cloudflare D1 — note D1 was previously scaffolded and removed from this codebase).

**Estimated Effort:** Architecture decision required before estimating

---

## Debt Backlog Priority Order

For sprint planning, the recommended order of attack:

1. **High:** Automated tests — invest incrementally, starting with critical paths
2. **Medium:** CampaignViewPage.tsx refactor — highest day-to-day developer pain
3. **Medium:** Bundle size / code splitting — user-visible performance improvement
4. **Medium:** Facebook API version audit — prevent future outage
5. **Low:** provider.ts stub cleanup — 1 day, high clarity gain
6. **Low:** Modal system migration — schedule for a slow sprint
7. **Low:** Stale hook alias check — quick win, do in next PR
8. **Low:** ForbiddenPage.tsx investigation — 1 hour task
