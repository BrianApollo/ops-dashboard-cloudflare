# Architecture Overview: ops-dashboard-cloudflare

**Date:** February 22, 2026
**Stack:** React + TypeScript + Vite | Material UI | Cloudflare Pages | Airtable

---

## System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         BROWSER                                 │
│                                                                 │
│   React App (Vite build, served as static files)               │
│   React Router v6 → Page Components → Feature Hooks            │
└──────────────────────────┬──────────────────────────────────────┘
                           │  HTTPS fetch() to /api/*
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│              CLOUDFLARE PAGES (Edge Functions)                  │
│                                                                 │
│   functions/api/airtable/[[route]].ts  ← Airtable proxy        │
│   functions/api/facebook/[[route]].ts  ← Facebook proxy        │
│   functions/api/images/[[route]].ts    ← Cloudflare Images     │
│   functions/api/drive/[[route]].ts     ← Google Drive          │
│   functions/api/redtrack/[[route]].ts  ← Redtrack              │
│   functions/api/adspower/[[route]].ts  ← AdsPower              │
│                                        (secrets stored in CF)  │
└──────┬───────────┬───────────┬──────────┬──────────┬───────────┘
       │           │           │          │          │
       ▼           ▼           ▼          ▼          ▼
  Airtable    Facebook     Cloudflare  Redtrack  AdsPower /
  REST API    Graph API    Images CDN  Analytics  Google Drive
```

All API secrets (Airtable API key, Facebook tokens, etc.) live in Cloudflare Pages environment variables. The React app never holds secrets — it only calls `/api/*` routes which are Cloudflare serverless functions acting as authenticated proxies.

---

## Full Folder Structure

```
ops-dashboard-cloudflare/
├── functions/                    Cloudflare Pages serverless functions
│   └── api/
│       ├── airtable/[[route]].ts  Airtable proxy (all DB calls)
│       ├── facebook/[[route]].ts  Facebook Graph API proxy
│       ├── images/[[route]].ts    Cloudflare Images proxy
│       ├── drive/[[route]].ts     Google Drive proxy
│       ├── redtrack/[[route]].ts  Redtrack proxy
│       └── adspower/[[route]].ts  AdsPower proxy
│
├── src/
│   ├── app/                      App bootstrap
│   │   ├── routes.tsx            React Router v6 route definitions
│   │   └── providers.tsx         React context provider tree
│   │
│   ├── pages/                    (8 files) — Route entry points, wiring only
│   │   ├── auth/
│   │   │   └── LoginPage.tsx
│   │   ├── campaigns/
│   │   │   ├── CampaignLaunchPage.tsx
│   │   │   └── CampaignViewPage.tsx
│   │   ├── infrastructure/
│   │   │   └── InfrastructurePage.tsx
│   │   ├── manage/
│   │   │   └── ManagePage.tsx
│   │   ├── products/
│   │   │   └── ProductsPage.tsx
│   │   ├── rules/
│   │   │   └── RulesPage.tsx
│   │   └── videos/
│   │       └── EditorPortalPage.tsx
│   │
│   ├── components/               (51 files) — Presentational UI components
│   │   ├── layout/               App shell
│   │   │   ├── OpsLayout.tsx
│   │   │   ├── NavItem.tsx
│   │   │   ├── ThemeToggle.tsx
│   │   │   └── UserMenu.tsx
│   │   ├── campaigns/
│   │   │   ├── CampaignsTab.tsx
│   │   │   ├── AddCampaignDialog.tsx
│   │   │   └── launch/           (campaign launch wizard components)
│   │   ├── products/
│   │   │   ├── ProductSelector.tsx
│   │   │   └── ProductCreationModal.tsx
│   │   ├── advertorials/
│   │   │   └── (tab + dialog components)
│   │   ├── images/
│   │   │   ├── ImagesTab.tsx
│   │   │   └── CreateImagesDialog.tsx
│   │   ├── scripts/
│   │   │   ├── ScriptsTab.tsx
│   │   │   └── AddScriptDialog.tsx
│   │   ├── videos/
│   │   │   ├── VideosTab.tsx
│   │   │   ├── VideoTable.tsx
│   │   │   └── VideoDetailPanel.tsx
│   │   ├── infrastructure/
│   │   │   ├── TreeCanvas.tsx
│   │   │   └── (dialogs + sidebar)
│   │   ├── rules/
│   │   │   ├── RuleDialog.tsx
│   │   │   └── DeleteConfirmDialog.tsx
│   │   └── setup/
│   │       └── SetupTab.tsx
│   │
│   ├── features/                 (94 files) — Business logic (hooks + data)
│   │   ├── ad-presets/
│   │   │   ├── data.ts
│   │   │   ├── types.ts
│   │   │   └── useAdPresetsController.ts
│   │   ├── advertorials/
│   │   │   ├── data.ts
│   │   │   ├── types.ts
│   │   │   └── useAdvertorialsController.ts
│   │   ├── campaigns/
│   │   │   ├── data.ts
│   │   │   ├── types.ts
│   │   │   ├── useCampaignsController.ts
│   │   │   ├── launch/           (10 hooks + fbLaunchApi + utilities)
│   │   │   └── facebook/         (Facebook API integration)
│   │   ├── facebook/             (direct FB Graph API hooks)
│   │   ├── images/
│   │   │   ├── data.ts
│   │   │   ├── types.ts
│   │   │   └── storage.ts
│   │   ├── infrastructure/
│   │   │   ├── data.ts
│   │   │   ├── config.ts
│   │   │   ├── api.ts
│   │   │   └── (hooks)
│   │   ├── manage/
│   │   │   ├── api.ts
│   │   │   ├── types.ts
│   │   │   └── useManageData.ts
│   │   ├── products/
│   │   │   ├── data.ts
│   │   │   ├── types.ts
│   │   │   ├── drive.ts
│   │   │   └── (hooks)
│   │   ├── profiles/
│   │   │   ├── data.ts
│   │   │   └── types.ts
│   │   ├── redtrack/
│   │   │   ├── api.ts
│   │   │   ├── types.ts
│   │   │   └── (hooks)
│   │   ├── rules/
│   │   │   ├── data.ts
│   │   │   └── types.ts
│   │   ├── scripts/
│   │   │   ├── data.ts
│   │   │   ├── types.ts
│   │   │   └── useScriptsController.ts
│   │   ├── users/
│   │   │   ├── data.ts
│   │   │   └── types.ts
│   │   └── videos/
│   │       ├── data.ts
│   │       ├── types.ts
│   │       ├── permissions.ts
│   │       └── (hooks)
│   │
│   ├── lib/                      (2 files) — Shared utilities / single source of truth
│   │   ├── airtable-types.ts     AirtableRecord, AirtableResponse interfaces
│   │   └── airtable-helpers.ts   fetchAllAirtableRecords() pagination helper
│   │
│   ├── core/                     Cross-cutting concerns
│   │   ├── auth/                 JWT auth logic
│   │   ├── bulk-actions/         Bulk operation utilities
│   │   ├── dialogs/              Shared dialog primitives
│   │   ├── forms/                Form utilities
│   │   ├── list/                 List + pagination components
│   │   ├── modals/               ModalProvider (modal state manager)
│   │   ├── panel/                Detail panel primitives
│   │   ├── permissions/          Permission guards
│   │   ├── state/                Global state utilities
│   │   └── toast/                Toast notification system
│   │
│   ├── data/
│   │   └── provider.ts           (180 lines) Airtable fetch for products + users
│   │
│   ├── ui/                       Shared UI primitives
│   │   ├── StatusPill.tsx
│   │   ├── ToggleTabs.tsx
│   │   └── colors.ts             Status colors + pill styles (merged from pills.ts)
│   │
│   ├── theme/                    MUI theming
│   │   ├── theme.ts
│   │   ├── typography.ts
│   │   └── ThemeContext.tsx
│   │
│   ├── constants/                App-wide constants
│   ├── services/
│   │   └── adspower.ts           AdsPower browser profile client
│   ├── utils/
│   │   ├── sort.ts
│   │   └── tokenizedSearch.ts
│   └── _unbound/
│       └── ForbiddenPage.tsx     (possibly unused — needs investigation)
│
├── public/                       Static assets
├── index.html
├── vite.config.ts
├── wrangler.toml                 Cloudflare Pages / Workers config
├── tsconfig.json
└── package.json
```

---

## Layer Explanation

### `src/pages/` — Route Wiring (8 files)
Each file corresponds to exactly one URL route. Pages import feature hooks and components; they do not contain business logic, fetch calls, or more than ~5 `useState` calls. They exist solely to wire components to data.

### `src/components/` — Presentational UI (51 files)
Pure UI components. They receive data and callbacks as props. They do not import from `features/` directly — they get everything from the page that mounts them. Organized by feature subdirectory for discoverability.

### `src/features/` — Business Logic (94 files)
All data fetching, state management, transformation, and API interaction lives here. Each feature subdirectory typically contains:
- `data.ts` — Airtable fetch functions for that feature
- `types.ts` — TypeScript types specific to that feature
- `use[Feature]Controller.ts` — React hook that orchestrates data + state for a page

### `src/lib/` — Shared Utilities (2 files)
Single source of truth for Airtable plumbing used across all features. Every `data.ts` file imports from here instead of defining its own copy.

### `src/core/` — Cross-Cutting Infrastructure
Auth, permissions, modals, forms, toasts, bulk actions. These are framework-level concerns used by many features.

### `functions/api/` — Cloudflare Serverless Proxies
Every external API call (Airtable, Facebook, etc.) goes through these. Secrets never leave the server. The React app only knows about `/api/*` URLs.

---

## Data Flow: User Action to Database

The following traces what happens when a user clicks "Save" on a product form:

```
1. USER CLICKS "Save" in ProductCreationModal (src/components/products/)
        │
        │ calls onSave(formData) prop
        ▼
2. PAGE HANDLER in ProductsPage.tsx (src/pages/products/)
        │
        │ calls saveProduct(formData) from feature hook
        ▼
3. FEATURE HOOK useProductsController.ts (src/features/products/)
        │
        │ calls createProduct(formData) from data.ts
        ▼
4. DATA FUNCTION in src/features/products/data.ts
        │
        │ calls fetchAllAirtableRecords() from src/lib/airtable-helpers.ts
        │ (or direct fetch for mutations)
        │
        │ constructs fetch('/api/airtable/products', { method: 'POST', body })
        ▼
5. CLOUDFLARE EDGE FUNCTION functions/api/airtable/[[route]].ts
        │
        │ reads AIRTABLE_API_KEY from Cloudflare environment secrets
        │ forwards request to Airtable REST API with auth header
        ▼
6. AIRTABLE REST API
        │
        │ writes record, returns response
        ▼
7. Response flows back up the chain:
   Airtable → Cloudflare Function → fetch() in data.ts
   → feature hook updates React state → component re-renders
```

---

## Application Routes

| URL Pattern | Page Component | Description |
|---|---|---|
| `/login` | `LoginPage.tsx` | JWT authentication |
| `/ops` | `ProductsPage.tsx` | Default ops view |
| `/ops/products` | `ProductsPage.tsx` | Product list |
| `/ops/products/:id` | `ProductsPage.tsx` | Product detail with tabs |
| `/ops/products/:id/campaigns/:campaignId` | `CampaignViewPage.tsx` | Campaign detail |
| `/ops/products/:id/campaigns/:campaignId/launch` | `CampaignLaunchPage.tsx` | Campaign launch wizard |
| `/ops/manage` | `ManagePage.tsx` | Facebook campaign management |
| `/ops/rules` | `RulesPage.tsx` | Scaling rules |
| `/ops/infrastructure` | `InfrastructurePage.tsx` | Account tree / infra view |
| `/videos` | `EditorPortalPage.tsx` | External editor portal |

---

## External Integrations

| Integration | Purpose | Access Path |
|---|---|---|
| Airtable | Primary database for all operational data | `/api/airtable/*` proxy |
| Facebook Graph API | Campaign creation, ad management, token refresh | `/api/facebook/*` proxy |
| Redtrack | Campaign analytics, UTM tracking | `/api/redtrack/*` proxy |
| AdsPower | Browser profile management for ad accounts | `/api/adspower/*` proxy |
| Cloudflare Images | Image upload, storage, CDN delivery | `/api/images/*` proxy |
| Google Drive | Video and product asset storage | `/api/drive/*` proxy |

---

## Architectural Rules (Non-Negotiables)

See `architectural-rules.md` for the full binding ruleset. The core principles are:

1. **Pages are wiring only** — no business logic, no direct fetch calls.
2. **All Airtable calls go through `features/[name]/data.ts`** — never from components or pages.
3. **All pagination uses `fetchAllAirtableRecords()`** from `src/lib/` — no custom loops.
4. **All shared types use `AirtableRecord`/`AirtableResponse`** from `src/lib/airtable-types.ts`.
5. **Secrets never reach the client** — all external API calls go through Cloudflare proxy functions.
