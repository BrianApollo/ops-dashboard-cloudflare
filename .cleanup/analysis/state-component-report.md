# State Management & Component Architecture Analysis Report
# Generated: 2026-02-22 | Agent: ab2c51e
# OVERSEER STATUS: APPROVED

## OVERSEER NOTES
Report is solid. Key corrections/additions:
- Campaign launch has 9 hooks but the architecture is GOOD — don't merge them
- State cleanup (Phases 4-5) happens AFTER folder structure migration (Phase 3)
- Modal state extraction is medium-complexity — do AFTER folder moves are done
- Color consolidation is safe to do at any time (no logic changes)

---

## KEY FINDINGS SUMMARY

### useState Hotspots (42 total in 5 worst components)
| Component | Count | Quick Wins |
|-----------|-------|------------|
| CampaignViewPage.tsx | 11 | budgetValue/Dirty → useDraftState; modals → ModalProvider |
| AdsPowerSection.tsx | 9 | fetch states → useQuery; form → useDraftState |
| ProductsPage.tsx | 7 | 4 modal opens → ModalProvider; fetch states → useQuery |
| ScriptsTab.tsx | ~10 | menu/modal states → hooks; form editing → useDraftState |
| CampaignTable.tsx | 8 | sort → useListController; toast → useNotification |

Target after cleanup: 42 → ~15 total in these 5 components.

### Hook Naming — 5 Patterns in Use
Current: Controller (57%), State (26%), Actions (4%), Flow (4%), Runner (4%)

Proposed standard:
- Data access hooks: use[Entity]Controller — keep existing
- Orchestration hooks: rename useCampaignLaunchController → useCampaignLaunchOrchestrator
- Form/selection state hooks: use[Entity][State] — keep existing
- Side-effect hooks: use[Feature][Effect] — rename useLaunchAutoSave → useLaunchAutoSaveEffect

Hooks to rename (7 total):
```
useCampaignLaunchController → useCampaignLaunchOrchestrator
useLaunchExecution → useLaunchOrchestrator
useAddAdsFlow → useAddAdsOrchestrator
useInfraActions → useInfrastructureActions
useRunLaunchPipeline → useLaunchPipelineRunner
useLaunchAutoSave → useLaunchAutoSaveEffect
usePrelaunchUploader → usePrelaunchUploaderEffect
```
Risk: LOW (each hook used in 1-2 files)

### Styling Issues
Hardcoded hex values found in CampaignViewPage.tsx (~10 values):
- '#bbf7d0', '#fecaca', '#d1fae5', '#fee2e2' — success/error flash colors
- '#059669', '#dc2626' — success/error text
- '#3b82f6' — primary blue button

3 duplicate color definition files to consolidate:
- src/constants/colors.ts → keep (product/editor palettes)
- src/ui/colors.ts → merge into theme
- src/ui/pills.ts → merge into theme or ui/colors.ts

### ModalProvider — Underutilized
9 modals currently use inline useState. Should use src/core/modals/ModalProvider.tsx:
- ProductCreationModal, AddCampaignDialog, AddScriptDialog, AddAdvertorialDialog,
  CreateImagesDialog, BulkEditModal, AddAdsModal, AddHooksDialog, RequestScrollstoppersDialog

### Campaign Launch Hooks — GOOD ARCHITECTURE
9 hooks total. Structure is sound — clear separation of concerns.
Do NOT merge hooks that have different responsibilities.
Minor: useLaunchFacebookInfra + useLaunchRedtrack could merge → useLaunchExternalInfra (optional).

### Cache Consolidation
Module-level caches in 7 data.ts files. These are being consolidated in Phase 2
via src/lib/reference-data.ts (fetchProducts, fetchUsers shared utilities).

---

## EXECUTION PLAN FOR STATE/COMPONENT CLEANUP (Phase 5)

### Step 5a: Color Consolidation (LOW RISK — do anytime)
1. Read src/ui/colors.ts and src/ui/pills.ts
2. Merge their contents into src/ui/colors.ts (keep one file)
3. Delete src/ui/pills.ts
4. Update any imports of pills.ts to use colors.ts
5. Replace hardcoded hex values in CampaignViewPage.tsx with theme tokens
6. Build check

### Step 5b: Modal State (MEDIUM RISK — after folder moves)
1. For each of the 9 modals, replace inline useState with ModalProvider
2. Test each modal open/close after migration
3. Build check after each modal

### Step 5c: Form State (MEDIUM RISK — after folder moves)
1. CampaignViewPage: budgetValue + budgetDirty → useDraftState
2. AdsPowerSection: form fields → useDraftState
3. ScriptsTab: scriptContentValue + editing state → useDraftState
4. Build + manual test after each

### Step 5d: Fetch State → useQuery (MEDIUM RISK)
1. AdsPowerSection: allProfiles, liveProfile, browserStatus → useQuery
2. Any other components with loading/data/error useState triads
3. Build + test after each

### Step 5e: Hook Renaming (LOW RISK)
1. Rename 7 hooks using find-and-replace on imports
2. Build check confirms no broken imports

---

## FILES THAT NEED CHANGES

### Color files
- src/ui/pills.ts — MERGE then DELETE
- src/ui/colors.ts — CONSOLIDATE (receives pills.ts content)
- src/domains/ops/campaigns/post-launch/CampaignViewPage.tsx — remove hardcoded hex

### Modal cleanup (after folder moves, so paths will be in src/pages/ and src/components/)
- src/pages/products/ProductsPage.tsx
- src/pages/campaigns/CampaignViewPage.tsx
- src/components/scripts/ScriptsTab.tsx

### Form state cleanup
- src/pages/campaigns/CampaignViewPage.tsx
- src/components/infrastructure/AdsPowerSection.tsx
- src/components/scripts/ScriptsTab.tsx

### Hook renames
- src/features/campaigns/launch/useCampaignLaunchController.ts (rename file)
- All imports of the above (in CampaignLaunchPage.tsx)
- src/features/campaigns/launch/useLaunchExecution.ts (rename file)
- All imports of the above
