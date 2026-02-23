# Folder Structure Analysis Report
# Generated: 2026-02-22 | Agent: a6ee556
# OVERSEER STATUS: APPROVED — with one priority note below.

## OVERSEER NOTE
Report is accurate and comprehensive. One adjustment to priority order:
The folder structure migration (Phase 4) is the HIGHEST RISK phase.
It must not start until Phase 2 (duplicate consolidation) is complete and verified.
The "copy files first, update imports second, delete old third" sequencing is CORRECT.
Do NOT attempt to move and update imports simultaneously.

---

## Executive Summary
The project has TWO PARALLEL HIERARCHIES:
1. src/features/ — business logic (data, hooks, types) ✅ Correct concept
2. src/domains/ — pages AND components AND hooks mixed together ❌ Wrong

Target structure:
- src/features/[name]/ = data.ts + types.ts + controller hook + index.ts ONLY
- src/pages/[name]/ = one Page component per route (pure wiring)
- src/components/[name]/ = shared UI components (used in 2+ places)
- src/lib/ = shared utilities (airtable client, helpers)

---

## PAGES — Current vs Target Location

| Page | Current | Target |
|------|---------|--------|
| LoginPage | domains/auth/ | pages/auth/ |
| ManagePage | domains/manage/ | pages/manage/ |
| ProductsPage | domains/ops/products/ | pages/products/ |
| CampaignLaunchPage | domains/ops/campaigns/launch/ | pages/campaigns/ |
| CampaignViewPage | domains/ops/campaigns/post-launch/ | pages/campaigns/ |
| InfrastructurePage | domains/ops/infrastructure/ | pages/infrastructure/ |
| RulesPage | domains/ops/rules/ | pages/rules/ |
| EditorPortalPage | pages/videos/ | pages/videos/ ✅ Already correct |

---

## COMPONENTS — All Moves Required

### Layout (4 files)
```
domains/ops/layout/OpsLayout.tsx → components/layout/
domains/ops/layout/NavItem.tsx → components/layout/
domains/ops/layout/ThemeToggle.tsx → components/layout/
domains/ops/layout/UserMenu.tsx → components/layout/
```

### Campaigns (complex — many files)
```
domains/ops/campaigns/pre-launch/CampaignsTab.tsx → components/campaigns/
domains/ops/campaigns/pre-launch/AddCampaignDialog.tsx → components/campaigns/
domains/ops/campaigns/post-launch/AddAdsModal.tsx → components/campaigns/
domains/ops/campaigns/launch/CampaignSetupColumn.tsx → components/campaigns/
domains/ops/campaigns/launch/CreativesColumn.tsx → components/campaigns/
domains/ops/campaigns/launch/FinalCheckColumn.tsx → components/campaigns/
domains/ops/campaigns/launch/LaunchProgressView.tsx → components/campaigns/
domains/ops/campaigns/launch/postlaunch/LaunchCompletionView.tsx → components/campaigns/
domains/ops/campaigns/launch/prelaunch/RedtrackCampaignSelector.tsx → components/campaigns/
domains/ops/campaigns/launch/prelaunch/CampaignSetupColumn.tsx → components/campaigns/
domains/ops/campaigns/launch/prelaunch/CreativesColumn.tsx → components/campaigns/
```

### Products (8 files)
```
domains/ops/products/ProductSelector.tsx → components/products/
domains/ops/products/ProductCreationModal.tsx → components/products/
domains/ops/products/composition/* → components/products/composition/
domains/ops/products/advertorials/AdvertorialsTab.tsx → components/advertorials/
domains/ops/products/advertorials/AddAdvertorialDialog.tsx → components/advertorials/
domains/ops/products/advertorials/AdvertorialDetailsModal.tsx → components/advertorials/
domains/ops/products/advertorials/UpdateAdvertorialDialog.tsx → components/advertorials/
```

### Images, Scripts, Videos, Setup (simple moves)
```
domains/ops/images/ImagesTab.tsx → components/images/
domains/ops/images/CreateImagesDialog.tsx → components/images/
domains/ops/scripts/ScriptsTab.tsx → components/scripts/
domains/ops/scripts/AddScriptDialog.tsx → components/scripts/
domains/ops/videos/VideosTab.tsx → components/videos/
domains/ops/setup/SetupTab.tsx → components/setup/
```

### Infrastructure (15 files)
```
domains/ops/infrastructure/components/* → components/infrastructure/
domains/ops/infrastructure/dialogs/* → components/infrastructure/
```

### Rules dialogs
```
domains/ops/rules/RuleDialog.tsx → components/rules/
domains/ops/rules/DeleteConfirmDialog.tsx → components/rules/
```

### Manage components
```
domains/manage/CampaignTable.tsx → components/
domains/manage/ProfileSelector.tsx → components/
domains/manage/AdReviewDialog.tsx → components/
```

### Features components (wrong folder currently)
```
features/redtrack/RedTrackDataPanel.tsx → components/
features/videos/VideoDetailPanel.tsx → components/videos/
features/videos/ScriptProductionGrid.tsx → components/videos/
features/videos/components/* → components/videos/
pages/ops/components/AddHooksDialog.tsx → components/
pages/ops/components/RequestScrollstoppersDialog.tsx → components/
```

---

## LOGIC/HOOKS — Move from domains to features

```
domains/manage/api.ts → features/manage/api.ts
domains/manage/types.ts → features/manage/types.ts
domains/manage/useManageData.ts → features/manage/useManageData.ts
domains/ops/campaigns/launch/useCampaignLaunchController.ts → features/campaigns/launch/
domains/ops/campaigns/launch/useLaunchExecution.ts → features/campaigns/launch/
domains/ops/campaigns/launch/launch/useRunLaunchPipeline.ts → features/campaigns/launch/
domains/ops/campaigns/launch/prelaunch/useLaunchAutoSave.ts → features/campaigns/launch/
domains/ops/campaigns/launch/prelaunch/useLaunchDraftState.ts → features/campaigns/launch/
domains/ops/campaigns/launch/prelaunch/useLaunchFacebookInfra.ts → features/campaigns/launch/
domains/ops/campaigns/launch/prelaunch/useLaunchMediaState.ts → features/campaigns/launch/
domains/ops/campaigns/launch/prelaunch/useLaunchRedtrack.ts → features/campaigns/launch/
domains/ops/campaigns/launch/prelaunch/useLaunchSelectionState.ts → features/campaigns/launch/
domains/ops/campaigns/launch/prelaunch/useLaunchValidation.ts → features/campaigns/launch/
domains/ops/campaigns/launch/prelaunch/usePrelaunchUploader.ts → features/campaigns/launch/
domains/ops/campaigns/post-launch/useAddAdsFlow.ts → features/campaigns/
domains/ops/campaigns/post-launch/mapTemplateCreative.ts → features/campaigns/launch/
domains/ops/campaigns/launch/postlaunch/writeLaunchSnapshot.ts → features/campaigns/launch/
domains/ops/products/hooks/* → features/products/
domains/ops/infrastructure/useInfraActions.ts → features/infrastructure/
domains/ops/infrastructure/useTreeState.ts → features/infrastructure/
domains/ops/rules/data.ts → features/rules/
domains/ops/rules/types.ts → features/rules/
```

---

## CRITICAL IMPORT CHANGES

### src/app/routes.tsx
```typescript
// BEFORE:
import { OpsLayout } from "../domains/ops/layout/OpsLayout";
import { ProductsPage } from "../domains/ops/products/ProductsPage";
import { CampaignLaunchPage } from "../domains/ops/campaigns/launch/CampaignLaunchPage";
import { CampaignViewPage } from "../domains/ops/campaigns/post-launch/CampaignViewPage";
import { InfrastructurePage } from "../domains/ops/infrastructure/InfrastructurePage";
import { ManagePage } from "../domains/manage/ManagePage";
import { RulesPage } from "../domains/ops/rules/RulesPage";
import LoginPage from "../domains/auth/LoginPage";

// AFTER:
import { OpsLayout } from "../components/layout/OpsLayout";
import { ProductsPage } from "../pages/products/ProductsPage";
import { CampaignLaunchPage } from "../pages/campaigns/CampaignLaunchPage";
import { CampaignViewPage } from "../pages/campaigns/CampaignViewPage";
import { InfrastructurePage } from "../pages/infrastructure/InfrastructurePage";
import { ManagePage } from "../pages/manage/ManagePage";
import { RulesPage } from "../pages/rules/RulesPage";
import LoginPage from "../pages/auth/LoginPage";
```

---

## EXECUTION ORDER (Safest Sequence)

### Stage 1: Create target directories (no file changes)
mkdir src/pages/{auth,manage,products,campaigns,infrastructure,rules}
mkdir src/components/{layout,campaigns,products,advertorials,images,scripts,videos,infrastructure,rules,setup}
mkdir src/features/{manage,rules}

### Stage 2: Copy files to new locations (DO NOT DELETE YET)
Copy in this order (least to most complex):
1. Simple tabs: images, scripts, videos, setup
2. Layout components
3. Manage (page + components + logic)
4. Products (page + components)
5. Rules (page + components + data)
6. Infrastructure (page + components + hooks)
7. Campaign pre/post-launch components
8. Campaign launch (hooks — highest complexity)

### Stage 3: Update imports (systematically, file by file)
1. routes.tsx first (it imports pages)
2. Each page file (they import components)
3. Each component file (they import features)
4. Feature index.ts files (add new exports)

### Stage 4: Build check — MUST PASS before proceeding

### Stage 5: Delete old locations
1. Delete src/domains/ ENTIRE TREE
2. Delete src/pages/ops/ (old location)
3. Final build check

---

## RISK ASSESSMENT

| Risk | Item | Mitigation |
|------|------|------------|
| HIGH | CampaignViewPage (~1800 lines, 20 useState) | Move as-is, don't refactor during move |
| HIGH | Campaign launch (30+ files, circular hooks) | Move entire group together |
| MEDIUM | InfrastructurePage (TreeCanvas complexity) | Move complete, test rendering |
| MEDIUM | ProductsPage (680 lines, tab composition) | Move as-is |
| LOW | Simple tabs and dialogs | Mechanical moves |

## Estimated Effort
- Total files affected: ~140
- Estimated time: 4-5 hours
- Risk level: HIGH (many imports change)
- Recovery: Build check after every stage catches issues before they compound

## RECOMMENDATION
Do NOT start this phase until Phase 2 (duplicate consolidation) build is verified.
Phases must be sequential to avoid compound failures.
