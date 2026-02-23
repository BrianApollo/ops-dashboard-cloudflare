# Feature Inventory: ops-dashboard-cloudflare

**Date:** February 22, 2026
**Status Key:** Active = fully working | Partial = works but has known debt | Deprecated = removed

---

## Feature Status Table

| # | Feature | Status | Page Entry Point | Feature Logic | Data Source | Notes |
|---|---|---|---|---|---|---|
| 1 | **Campaign Management** | Active | `CampaignViewPage.tsx` | `features/campaigns/` | Airtable | Page is ~1,800 lines — future refactor candidate |
| 2 | **Campaign Launch Wizard** | Active | `CampaignLaunchPage.tsx` | `features/campaigns/launch/` (10 hooks) | Airtable + Facebook Graph API | Multi-step wizard with FB ad creation |
| 3 | **Video Management** | Active | `ProductsPage.tsx` (tab) | `features/videos/` | Airtable | List, upload, approve, detail panel |
| 4 | **Script Management** | Active | `ProductsPage.tsx` (tab) | `features/scripts/` | Airtable | List, create, approve |
| 5 | **Image Management** | Active | `ProductsPage.tsx` (tab) | `features/images/` | Airtable + Cloudflare Images | List, create, approve; storage.ts handles CDN upload |
| 6 | **Product Management** | Active | `ProductsPage.tsx` | `features/products/` | Airtable + Google Drive | List, create; drive.ts handles asset links |
| 7 | **Advertorial Management** | Active | `ProductsPage.tsx` (tab) | `features/advertorials/` | Airtable | List, add, update |
| 8 | **Ad Presets Management** | Active | `ProductsPage.tsx` (tab) | `features/ad-presets/` | Airtable | Preset library for campaign launch |
| 9 | **Infrastructure Management** | Active | `InfrastructurePage.tsx` | `features/infrastructure/` | Airtable | Tree canvas showing accounts, pixels, pages, BMs |
| 10 | **Rules / Scaling Rules** | Active | `RulesPage.tsx` | `features/rules/` | Airtable | Rule creation/deletion with confirm dialog |
| 11 | **Manage (FB Campaign Mgmt)** | Active | `ManagePage.tsx` | `features/manage/` + `features/facebook/` | Facebook Graph API | Live Facebook campaign data, budget management |
| 12 | **Authentication** | Active | `LoginPage.tsx` | `core/auth/` | JWT (Cloudflare-verified) | Token stored client-side; route guards in place |
| 13 | **Editor Portal** | Active | `EditorPortalPage.tsx` | `features/videos/` (subset) | Airtable | External-facing view for video editors; separate route `/videos` |
| 14 | **User Management** | Active (data only) | N/A (no dedicated page) | `features/users/` | Airtable | Users loaded via `provider.ts`; used for auth and assignment dropdowns |
| 15 | **Profile Management** | Active (data only) | `InfrastructurePage.tsx` | `features/profiles/` | Airtable + AdsPower | Browser profile tracking; AdsPower integration via `services/adspower.ts` |
| 16 | **Redtrack Integration** | Active | `ManagePage.tsx` (partial) | `features/redtrack/` | Redtrack API | UTM and analytics data for campaigns |

---

## Campaign Management Detail

| Sub-Feature | Status | Location |
|---|---|---|
| List campaigns for a product | Active | `features/campaigns/data.ts` |
| View campaign detail | Active | `CampaignViewPage.tsx` + `features/campaigns/` |
| Add new campaign | Active | `components/campaigns/AddCampaignDialog.tsx` |
| Launch campaign (wizard) | Active | `CampaignLaunchPage.tsx` + `features/campaigns/launch/` |
| Review ad creatives | Active | `features/campaigns/facebook/` |
| Facebook ad approval flow | Active | `features/campaigns/facebook/` |
| Facebook token management | Active | `features/facebook/` |

## Video Management Detail

| Sub-Feature | Status | Location |
|---|---|---|
| List videos | Active | `components/videos/VideoTable.tsx` |
| Upload video | Active | `features/videos/data.ts` |
| Video detail panel | Active | `components/videos/VideoDetailPanel.tsx` |
| Approve video | Active | `features/videos/` (hooks) |
| Editor portal view | Active | `EditorPortalPage.tsx` |
| Permission-based visibility | Active | `features/videos/permissions.ts` |

## Infrastructure Management Detail

| Sub-Feature | Status | Location |
|---|---|---|
| Account tree visualization | Active | `components/infrastructure/TreeCanvas.tsx` |
| Ad account management | Active | `features/infrastructure/data.ts` |
| Pixel management | Active | `features/infrastructure/` |
| Facebook Pages management | Active | `features/infrastructure/` |
| Business Manager management | Active | `features/infrastructure/` |
| Profile (AdsPower) management | Active | `features/profiles/` + `services/adspower.ts` |
| Infrastructure config | Active | `features/infrastructure/config.ts` |

---

## Deprecated / Removed Features

| Feature | What Was Removed | Reason |
|---|---|---|
| **D1 Database layer** | `src/db/` (16 files), `functions/api/d1/`, database migration scripts | Never used in production; Airtable is the live database |
| **Database migrations** | `migrations/`, `dbmigration/` directories | Tied to unused D1 layer |
| **D1 guard branches** | Conditional code in `provider.ts` checking for D1 vs Airtable | D1 was never active; branches were always taking the Airtable path |

---

## Notes on Large / Complex Features

**CampaignViewPage.tsx** (~1,800 lines, 11 useState calls): This is the most complex file in the codebase. It is fully functional but is a refactor candidate. Future work should extract tab sections into dedicated sub-components each holding their own state.

**Campaign Launch** (`features/campaigns/launch/`): Contains 10 separate hooks that orchestrate a multi-step Facebook campaign creation flow. This is intentionally complex due to the Facebook API interaction sequence and is well-structured as individual step hooks.

**Manage Page** (`ManagePage.tsx`): Interfaces directly with live Facebook Graph API data via the `features/manage/` and `features/facebook/` modules. Sensitive to Facebook API version changes and token expiry.
