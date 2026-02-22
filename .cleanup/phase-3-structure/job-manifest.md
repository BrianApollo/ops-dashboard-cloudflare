# Phase 3: Folder Structure Migration Job Manifest
# Strategy: COPY → UPDATE IMPORTS → VERIFY BUILD → DELETE OLD
# Each line: SOURCE → TARGET
# Status: [ ] = todo, [x] = done, [!] = skip/review

## STAGE A: Create Directories
[ ] mkdir src/pages/auth
[ ] mkdir src/pages/manage
[ ] mkdir src/pages/products
[ ] mkdir src/pages/campaigns
[ ] mkdir src/pages/infrastructure
[ ] mkdir src/pages/rules
[ ] mkdir src/components/layout
[ ] mkdir src/components/campaigns
[ ] mkdir src/components/products
[ ] mkdir src/components/products/composition
[ ] mkdir src/components/advertorials
[ ] mkdir src/components/images
[ ] mkdir src/components/scripts
[ ] mkdir src/components/videos
[ ] mkdir src/components/infrastructure
[ ] mkdir src/components/rules
[ ] mkdir src/components/setup
[ ] mkdir src/features/manage
[ ] mkdir src/features/rules

## STAGE B: Copy Files (DO NOT DELETE ORIGINALS YET)

### B1: Pages
[ ] domains/auth/LoginPage.tsx → pages/auth/LoginPage.tsx
[ ] domains/auth/index.ts → pages/auth/index.ts
[ ] domains/manage/ManagePage.tsx → pages/manage/ManagePage.tsx
[ ] domains/ops/products/ProductsPage.tsx → pages/products/ProductsPage.tsx
[ ] domains/ops/campaigns/launch/CampaignLaunchPage.tsx → pages/campaigns/CampaignLaunchPage.tsx
[ ] domains/ops/campaigns/post-launch/CampaignViewPage.tsx → pages/campaigns/CampaignViewPage.tsx
[ ] domains/ops/infrastructure/InfrastructurePage.tsx → pages/infrastructure/InfrastructurePage.tsx
[ ] domains/ops/rules/RulesPage.tsx → pages/rules/RulesPage.tsx

### B2: Layout Components
[ ] domains/ops/layout/OpsLayout.tsx → components/layout/OpsLayout.tsx
[ ] domains/ops/layout/NavItem.tsx → components/layout/NavItem.tsx
[ ] domains/ops/layout/ThemeToggle.tsx → components/layout/ThemeToggle.tsx
[ ] domains/ops/layout/UserMenu.tsx → components/layout/UserMenu.tsx
[ ] domains/ops/layout/index.ts → components/layout/index.ts

### B3: Logic → features/manage
[ ] domains/manage/api.ts → features/manage/api.ts
[ ] domains/manage/types.ts → features/manage/types.ts
[ ] domains/manage/useManageData.ts → features/manage/useManageData.ts

### B4: Logic → features/rules
[ ] domains/ops/rules/data.ts → features/rules/data.ts
[ ] domains/ops/rules/types.ts → features/rules/types.ts

### B5: Logic → features/infrastructure
[ ] domains/ops/infrastructure/useInfraActions.ts → features/infrastructure/useInfraActions.ts
[ ] domains/ops/infrastructure/useTreeState.ts → features/infrastructure/useTreeState.ts

### B6: Logic → features/campaigns/launch
[ ] domains/ops/campaigns/launch/useCampaignLaunchController.ts → features/campaigns/launch/useCampaignLaunchController.ts
[ ] domains/ops/campaigns/launch/useLaunchExecution.ts → features/campaigns/launch/useLaunchExecution.ts
[ ] domains/ops/campaigns/launch/launch/useRunLaunchPipeline.ts → features/campaigns/launch/useRunLaunchPipeline.ts
[ ] domains/ops/campaigns/launch/prelaunch/useLaunchAutoSave.ts → features/campaigns/launch/useLaunchAutoSave.ts
[ ] domains/ops/campaigns/launch/prelaunch/useLaunchDraftState.ts → features/campaigns/launch/useLaunchDraftState.ts
[ ] domains/ops/campaigns/launch/prelaunch/useLaunchFacebookInfra.ts → features/campaigns/launch/useLaunchFacebookInfra.ts
[ ] domains/ops/campaigns/launch/prelaunch/useLaunchMediaState.ts → features/campaigns/launch/useLaunchMediaState.ts
[ ] domains/ops/campaigns/launch/prelaunch/useLaunchRedtrack.ts → features/campaigns/launch/useLaunchRedtrack.ts
[ ] domains/ops/campaigns/launch/prelaunch/useLaunchSelectionState.ts → features/campaigns/launch/useLaunchSelectionState.ts
[ ] domains/ops/campaigns/launch/prelaunch/useLaunchValidation.ts → features/campaigns/launch/useLaunchValidation.ts
[ ] domains/ops/campaigns/launch/prelaunch/usePrelaunchUploader.ts → features/campaigns/launch/usePrelaunchUploader.ts
[ ] domains/ops/campaigns/launch/postlaunch/writeLaunchSnapshot.ts → features/campaigns/launch/writeLaunchSnapshot.ts
[ ] domains/ops/campaigns/post-launch/mapTemplateCreative.ts → features/campaigns/launch/mapTemplateCreative.ts
[ ] domains/ops/campaigns/post-launch/useAddAdsFlow.ts → features/campaigns/useAddAdsFlow.ts

### B7: Logic → features/products
[ ] domains/ops/products/hooks/useDetailPanel.ts → features/products/useDetailPanel.ts
[ ] domains/ops/products/hooks/usePresetController.ts → features/products/usePresetController.ts
[ ] domains/ops/products/hooks/useVideoDetailActions.ts → features/videos/useVideoDetailActions.ts

### B8: Components → components/layout (already done in B2)

### B9: Components → components/campaigns
[ ] domains/ops/campaigns/pre-launch/CampaignsTab.tsx → components/campaigns/CampaignsTab.tsx
[ ] domains/ops/campaigns/pre-launch/AddCampaignDialog.tsx → components/campaigns/AddCampaignDialog.tsx
[ ] domains/ops/campaigns/post-launch/AddAdsModal.tsx → components/campaigns/AddAdsModal.tsx
[ ] domains/ops/campaigns/launch/FinalCheckColumn.tsx → components/campaigns/FinalCheckColumn.tsx
[ ] domains/ops/campaigns/launch/LaunchProgressView.tsx → components/campaigns/LaunchProgressView.tsx
[ ] domains/ops/campaigns/launch/prelaunch/CampaignSetupColumn.tsx → components/campaigns/CampaignSetupColumn.tsx
[ ] domains/ops/campaigns/launch/prelaunch/CreativesColumn.tsx → components/campaigns/CreativesColumn.tsx
[ ] domains/ops/campaigns/launch/prelaunch/RedtrackCampaignSelector.tsx → components/campaigns/RedtrackCampaignSelector.tsx
[ ] domains/ops/campaigns/launch/postlaunch/LaunchCompletionView.tsx → components/campaigns/LaunchCompletionView.tsx

### B10: Components → components/products
[ ] domains/ops/products/ProductSelector.tsx → components/products/ProductSelector.tsx
[ ] domains/ops/products/ProductCreationModal.tsx → components/products/ProductCreationModal.tsx
[ ] domains/ops/products/composition/styles.ts → components/products/composition/styles.ts
[ ] domains/ops/products/composition/types.ts → components/products/composition/types.ts
[ ] domains/ops/products/composition/index.ts → components/products/composition/index.ts

### B11: Components → components/advertorials
[ ] domains/ops/products/advertorials/AdvertorialsTab.tsx → components/advertorials/AdvertorialsTab.tsx
[ ] domains/ops/products/advertorials/AddAdvertorialDialog.tsx → components/advertorials/AddAdvertorialDialog.tsx
[ ] domains/ops/products/advertorials/AdvertorialDetailsModal.tsx → components/advertorials/AdvertorialDetailsModal.tsx
[ ] domains/ops/products/advertorials/UpdateAdvertorialDialog.tsx → components/advertorials/UpdateAdvertorialDialog.tsx

### B12: Components → components/images
[ ] domains/ops/images/ImagesTab.tsx → components/images/ImagesTab.tsx
[ ] domains/ops/images/CreateImagesDialog.tsx → components/images/CreateImagesDialog.tsx

### B13: Components → components/scripts
[ ] domains/ops/scripts/ScriptsTab.tsx → components/scripts/ScriptsTab.tsx
[ ] domains/ops/scripts/AddScriptDialog.tsx → components/scripts/AddScriptDialog.tsx

### B14: Components → components/videos
[ ] domains/ops/videos/VideosTab.tsx → components/videos/VideosTab.tsx
[ ] features/videos/VideoDetailPanel.tsx → components/videos/VideoDetailPanel.tsx
[ ] features/videos/ScriptProductionGrid.tsx → components/videos/ScriptProductionGrid.tsx
[ ] features/videos/components/VideoTable.tsx → components/videos/VideoTable.tsx
[ ] features/videos/components/VideoNameCell.tsx → components/videos/VideoNameCell.tsx
[ ] features/videos/components/videoTableColumns.tsx → components/videos/videoTableColumns.tsx

### B15: Components → components/infrastructure
[ ] domains/ops/infrastructure/components/AdsPowerSection.tsx → components/infrastructure/AdsPowerSection.tsx
[ ] domains/ops/infrastructure/components/DetailsSidebar.tsx → components/infrastructure/DetailsSidebar.tsx
[ ] domains/ops/infrastructure/components/FacebookLoginButton.tsx → components/infrastructure/FacebookLoginButton.tsx
[ ] domains/ops/infrastructure/components/FilterDropdown.tsx → components/infrastructure/FilterDropdown.tsx
[ ] domains/ops/infrastructure/components/SetupInfoDialog.tsx → components/infrastructure/SetupInfoDialog.tsx
[ ] domains/ops/infrastructure/components/SidebarSection.tsx → components/infrastructure/SidebarSection.tsx
[ ] domains/ops/infrastructure/components/TreeCanvas.tsx → components/infrastructure/TreeCanvas.tsx
[ ] domains/ops/infrastructure/components/TreeColumn.tsx → components/infrastructure/TreeColumn.tsx
[ ] domains/ops/infrastructure/components/TreeConnections.tsx → components/infrastructure/TreeConnections.tsx
[ ] domains/ops/infrastructure/components/TreeNode.tsx → components/infrastructure/TreeNode.tsx
[ ] domains/ops/infrastructure/dialogs/GenerateTokenDialog.tsx → components/infrastructure/GenerateTokenDialog.tsx
[ ] domains/ops/infrastructure/dialogs/SetTokenDialog.tsx → components/infrastructure/SetTokenDialog.tsx
[ ] domains/ops/infrastructure/dialogs/SyncProgressDialog.tsx → components/infrastructure/SyncProgressDialog.tsx

### B16: Components → components/rules
[ ] domains/ops/rules/RuleDialog.tsx → components/rules/RuleDialog.tsx
[ ] domains/ops/rules/DeleteConfirmDialog.tsx → components/rules/DeleteConfirmDialog.tsx

### B17: Components → components/setup
[ ] domains/ops/setup/SetupTab.tsx → components/setup/SetupTab.tsx

### B18: Manage components → components/
[ ] domains/manage/CampaignTable.tsx → components/CampaignTable.tsx
[ ] domains/manage/ProfileSelector.tsx → components/ProfileSelector.tsx
[ ] domains/manage/AdReviewDialog.tsx → components/AdReviewDialog.tsx

### B19: RedTrack component
[ ] features/redtrack/RedTrackDataPanel.tsx → components/RedTrackDataPanel.tsx

### B20: Loose page components
[ ] pages/ops/components/AddHooksDialog.tsx → components/AddHooksDialog.tsx
[ ] pages/ops/components/RequestScrollstoppersDialog.tsx → components/RequestScrollstoppersDialog.tsx

## STAGE C: UPDATE IMPORTS
# After all files are copied, update imports to point to new locations
# KEY FILES TO UPDATE (update these FIRST — they're imported by routes.tsx):
# 1. routes.tsx - 9 import paths change
# 2. pages/campaigns/CampaignLaunchPage.tsx - imports hooks + components
# 3. pages/campaigns/CampaignViewPage.tsx - imports AddAdsModal + hooks
# 4. pages/products/ProductsPage.tsx - imports ~15 tabs/dialogs/hooks
# 5. pages/infrastructure/InfrastructurePage.tsx - imports ~10 components + hooks
# 6. pages/manage/ManagePage.tsx - imports 3 components + 3 feature items
# 7. pages/rules/RulesPage.tsx - imports 2 dialogs + features/rules/
# 8. All components that import from features/ (update relative paths)

## STAGE D: BUILD CHECK
# npm run build must pass before deleting old files

## STAGE E: DELETE OLD DIRECTORIES
# Only after build passes:
[ ] rm -rf src/domains/ (entire directory)
[ ] rm -rf src/pages/ops/ (old ops-specific pages)
[ ] rm -f features/videos/VideoDetailPanel.tsx (moved to components/)
[ ] rm -f features/videos/ScriptProductionGrid.tsx (moved to components/)
[ ] rm -rf features/videos/components/ (moved to components/videos/)
[ ] rm -f features/redtrack/RedTrackDataPanel.tsx (moved to components/)

## STAGE F: FINAL BUILD CHECK
# npm run build must pass clean

## NOTES FOR CONTEXT WINDOW RECOVERY
# If this session resets, read this file to see what's done (marked [x])
# and continue from the first [ ] item
# Always run npm run build after each stage to verify
