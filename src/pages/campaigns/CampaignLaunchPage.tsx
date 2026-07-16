/**
 * CampaignLaunchPage - Assemble, validate, and launch a campaign.
 *
 * Route: /ops/products/:id/campaigns/:campaignId/launch
 *
 * UI Modes:
 * - Pre-Launch: Configuration view (3-column layout)
 * - Launching: Progress view (execution in progress)
 * - Complete: Outcome view (success/failure with next actions)
 *
 * This page is pure wiring - all logic is in useCampaignLaunchController.
 */

import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import SaveIcon from '@mui/icons-material/Save';
// Controller - canonical location
import { useCampaignLaunchOrchestrator } from '../../features/campaigns/launch/useCampaignLaunchOrchestrator';
import { useAnglesController } from '../../features/angles';
import { useAdvertorialsController } from '../../features/advertorials/useAdvertorialsController';
// Components - canonical location
import { CreativesColumn } from '../../components/campaigns/CreativesColumn';
import { CampaignSetupColumn } from '../../components/campaigns/CampaignSetupColumn';
import { AdsSettingsSection, type AdsSettingsValidation } from '../../components/campaigns/AdsSettingsSection';
import { FinalCheckColumn } from '../../components/campaigns/FinalCheckColumn';
// LaunchProgressView - canonical location
import { LaunchProgressView } from '../../components/campaigns/LaunchProgressView';
import { saveLaunchTemplate } from '../../features/campaigns/data';
import type { AngleCreativeConfig } from '../../features/campaigns/launch/types';

// =============================================================================
// UI MODE TYPE
// =============================================================================

type UIMode = 'pre-launch' | 'launching' | 'complete';

/**
 * Normalize a URL for loose equality: lowercase, drop protocol, leading
 * `www.`, and any trailing slashes. Lets an advertorial link match a lander
 * URL despite cosmetic differences (http vs https, trailing slash, www).
 */
function normalizeUrl(url: string): string {
  return url
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/+$/, '');
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function CampaignLaunchPage() {
  const { id: productIdParam, campaignId } = useParams<{ id?: string; campaignId: string }>();
  const navigate = useNavigate();

  // Controller owns all business logic
  const c = useCampaignLaunchOrchestrator(campaignId!, productIdParam);

  // Angles (for labelling per-angle Ads Settings sections in the middle column)
  const anglesController = useAnglesController();
  const anglesById = useMemo(() => {
    const map: Record<string, string> = {};
    anglesController.angles.forEach((a) => { map[a.id] = a.name; });
    return map;
  }, [anglesController.angles]);

  // Advertorials (for the per-angle Advertorial dropdown in Ads Settings).
  // Filtered to the current product, projected to the minimal shape the section needs.
  const advertorialsController = useAdvertorialsController();
  const advertorialsForProduct = useMemo(() => {
    if (!c.productId) return [];
    // Show every advertorial for the product. Those whose link matches one of
    // the campaign's RedTrack lander URLs are flagged (`matchesLander`) so the
    // dropdown can highlight them, and carry the paired offer URL.
    const landers = c.redtrackData?.landers ?? [];
    const offers = c.redtrackData?.offers ?? [];
    const landerUrls = new Set(landers.map((l) => normalizeUrl(l.url)).filter(Boolean));
    // Pair lander → offer by index (the arrays are index-aligned). Keyed by
    // normalized lander URL so a selected advertorial's link resolves to its
    // paired offer URL.
    const offerUrlByLanderUrl = new Map<string, string>();
    landers.forEach((l, i) => {
      const key = normalizeUrl(l.url);
      const offerUrl = offers[i]?.url;
      if (key && offerUrl) offerUrlByLanderUrl.set(key, offerUrl);
    });
    return advertorialsController.advertorials
      .filter((a) => a.productId === c.productId)
      .map((a) => {
        const matchesLander = !!a.link && landerUrls.has(normalizeUrl(a.link));
        return {
          id: a.id,
          name: a.name,
          link: a.link,
          angleId: a.angleId,
          matchesLander,
          offerUrl: a.link ? offerUrlByLanderUrl.get(normalizeUrl(a.link)) : undefined,
        };
      });
  }, [advertorialsController.advertorials, c.productId, c.redtrackData]);

  // UI-only state (not business logic)
  const [mediaCollapsed, setMediaCollapsed] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  // Per-angle Ads Settings validation, reported up from AdsSettingsSection.
  // Folded into the launch validation below.
  const [adsValidation, setAdsValidation] = useState<AdsSettingsValidation>({
    sectionCount: 0,
    allPresetsSelected: false,
    allAdvertorialsSelected: false,
    allLinksReplaced: false,
  });

  // Resolved per-angle creative config, reported up from AdsSettingsSection and
  // passed into launch() so each ad's creative uses its angle's preset + lander.
  const [adsAngleConfigs, setAdsAngleConfigs] = useState<AngleCreativeConfig[]>([]);

  // Fold the per-angle Ads Settings state into the controller's validation.
  // The orchestrator's draft-based "Ad preset" / "{{link}} replaced" checks are
  // superseded by the per-angle sections, and an "Advertorial" check is added.
  const validationGroups = useMemo(() => {
    type Check = { id: string; label: string; group: string; passed: boolean };
    return c.validationGroups.map((g) => {
      if (g.name !== 'Assets') return g;
      const checks: Check[] = (g.checks as Check[])
        .map((chk): Check => {
          if (chk.id === 'preset') return { ...chk, passed: adsValidation.allPresetsSelected };
          if (chk.id === 'link-replaced') {
            return { ...chk, label: 'Advertorial links replaced', passed: adsValidation.allLinksReplaced };
          }
          return chk;
        })
        .flatMap((chk): Check[] =>
          // Insert the new "Advertorial" check right after the preset check.
          chk.id === 'preset'
            ? [chk, { id: 'advertorial', label: 'Advertorial', group: chk.group, passed: adsValidation.allAdvertorialsSelected }]
            : [chk]
        );
      return { ...g, checks, allPassed: checks.every((chk) => chk.passed) };
    });
  }, [c.validationGroups, adsValidation]);

  const allChecksPass = useMemo(
    () => validationGroups.every((g) => g.allPassed),
    [validationGroups]
  );

  const handleSaveTemplate = async () => {
    if (!c.productId) return;
    setIsSavingTemplate(true);
    try {
      await saveLaunchTemplate({
        productId: c.productId,
        adAccount: c.draft.adAccountId ?? undefined,
        pixel: c.draft.pixelId ?? undefined,
        page: c.draft.pageId ?? undefined,
        amount: c.draft.budget || undefined,
        callToAction: c.draft.ctaOverride || undefined,
        targeting: c.draft.geo || undefined,
      });
      alert('Template saved!');
    } catch (error) {
      alert(`Failed to save template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSavingTemplate(false);
    }
  };

  // Derive UI mode from controller state
  const uiMode: UIMode = useMemo(() => {
    if (c.isLaunching) return 'launching';
    if (c.launchResult?.success || c.launchResult?.error) return 'complete';
    return 'pre-launch';
  }, [c.isLaunching, c.launchResult]);

  // ---------------------------------------------------------------------------
  // LOADING
  // ---------------------------------------------------------------------------
  if (c.isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!c.campaign) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="error">Campaign not found</Typography>
      </Box>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER: LAUNCHING / COMPLETE MODE
  // ---------------------------------------------------------------------------
  if (uiMode === 'launching' || uiMode === 'complete') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto' }}>
        <LaunchProgressView
          campaignName={c.draft.name || 'Campaign'}
          progress={c.launchProgress}
          isLaunching={c.isLaunching}
          selectedVideos={c.selectedVideosForPreview.map((v) => ({ id: v.id, name: v.name }))}
          selectedImages={c.selectedImagesForPreview.map((i) => ({ id: i.id, name: i.name }))}
          launchResult={c.launchResult}
          adAccountId={c.draft.adAccountId}
          onBackToProduct={() => navigate(c.productId ? `/ops/products/${c.productId}` : '/ops/products')}
          onRetryItem={c.retryItem}
        />
      </Box>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER: PRE-LAUNCH MODE (Configuration)
  // ---------------------------------------------------------------------------
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton
          onClick={() => navigate(c.productId ? `/ops/products/${c.productId}` : '/ops/products')}
          sx={{ bgcolor: 'action.hover' }}
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h3" sx={{ fontWeight: 600, flex: 1 }}>
          Campaign Launcher - {c.campaign?.product.name || 'Product'}
        </Typography>

        {/* Save as Template */}
        <Button
          size="small"
          variant="outlined"
          color="info"
          disabled={isSavingTemplate}
          startIcon={isSavingTemplate ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
          onClick={handleSaveTemplate}
          sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}
        >
          {isSavingTemplate ? 'Saving...' : 'Save as Template'}
        </Button>

        {/* Profile Selector */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <FormControl size="small" sx={{ minWidth: 200 }} error={!!c.profileError}>
            <InputLabel id="profile-select-label">Profile</InputLabel>
            <Select
              labelId="profile-select-label"
              id="profile-select"
              value={c.selectedProfile?.id ?? ''}
              label="Profile"
              onChange={(e) => c.selectProfile(e.target.value)}
              error={!!c.profileError}
            >
              {c.profiles.map((profile) => (
                <MenuItem key={profile.id} value={profile.id}>
                  {profile.profileName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {c.profileError && (
            <Typography sx={{ fontSize: 12, color: 'error.main' }}>
              {c.profileError}
            </Typography>
          )}
        </Box>

        {/* Auto-save status indicator */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 100 }}>
          {c.saveStatus === 'saving' && (
            <>
              <CircularProgress size={16} />
              <Typography variant="body2" color="text.secondary">Saving...</Typography>
            </>
          )}
          {c.saveStatus === 'saved' && (
            <>
              <CheckCircleIcon sx={{ fontSize: 18, color: 'success.main' }} />
              <Typography variant="body2" color="text.secondary">Saved</Typography>
            </>
          )}
          {c.saveStatus === 'error' && (
            <>
              <ErrorIcon sx={{ fontSize: 18, color: 'error.main' }} />
              <Typography variant="body2" color="error.main">Save failed</Typography>
            </>
          )}
        </Box>
      </Box>

      {/* Three Column Grid with blocking overlay */}
      <Box sx={{ position: 'relative', flex: 1, minHeight: 0 }}>
        {/* Blocking overlay when no profile selected */}
        {!c.isProfileSelected && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              bgcolor: 'rgba(255, 255, 255, 0.8)',
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 2,
              backdropFilter: 'blur(2px)',
            }}
          >
            <Box sx={{ textAlign: 'center', p: 4 }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Select a Profile to Continue
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Choose a profile from the dropdown above to enable campaign configuration
              </Typography>
            </Box>
          </Box>
        )}

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: mediaCollapsed ? '48px 1.5fr 1fr' : '1.2fr 1.2fr 1fr',
            gap: 3,
            height: '100%',
            transition: 'grid-template-columns 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            pointerEvents: c.isProfileSelected ? 'auto' : 'none',
            opacity: c.isProfileSelected ? 1 : 0.5,
          }}
        >
          {/* LEFT: Creatives */}
          <CreativesColumn
            videos={c.availableVideos}
            images={c.availableImages}
            selectedVideoIds={c.selectedVideoIds}
            selectedImageIds={c.selectedImageIds}
            onToggleVideo={c.toggleVideo}
            onToggleImage={c.toggleImage}
            onSelectRandomVideos={c.selectRandomVideos}
            onSelectRandomImages={c.selectRandomImages}
            onUnselectAllVideos={c.unselectAllVideos}
            onUnselectAllImages={c.unselectAllImages}
            collapsed={mediaCollapsed}
            onToggleCollapse={() => setMediaCollapsed(!mediaCollapsed)}
            reuseCreatives={c.reuseCreatives}
            onToggleReuseCreatives={c.toggleReuseCreatives}
            prelaunchUploader={c.prelaunchUploader}
            canCheckLibrary={!!c.draft.adAccountId && !!c.selectedProfile}
            videosNotInLibraryCount={c.videosNotInLibraryCount}
            selectedNotInLibraryCount={c.selectedNotInLibraryCount}
            anglesById={anglesById}
            onDeleteImage={c.deleteImage}
          />

          {/* CENTER: Campaign Setup + Ads Settings (sibling sections) */}
          <Box sx={{ alignSelf: 'start', position: 'sticky', top: 24, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <CampaignSetupColumn
              draft={c.draft}
              onDraftChange={c.updateDraft}
              adAccounts={c.adAccounts}
              pages={c.pages}
              pixels={c.pixels}
              redtrackData={c.redtrackData}
              redtrackCampaigns={c.redtrackCampaigns}
              redtrackCampaignsLoading={c.redtrackCampaignsLoading}
              websiteUrlFromRedtrack={c.websiteUrlFromRedtrack}
              pixelsError={c.pixelsError}
              pagesError={c.pagesError}
              pixelsLoading={c.pixelsLoading}
              pagesLoading={c.pagesLoading}
            />
            <AdsSettingsSection
              selectedVideos={c.selectedVideosForPreview}
              selectedImages={c.selectedImagesForPreview}
              anglesById={anglesById}
              adPresets={c.productPresets}
              advertorials={advertorialsForProduct}
              onValidationChange={setAdsValidation}
              onConfigChange={setAdsAngleConfigs}
            />
          </Box>

          {/* RIGHT: Final Check - Simplified for pre-launch */}
          <Box sx={{ alignSelf: 'start', position: 'sticky', top: 24 }}>
            <FinalCheckColumn
              validationGroups={validationGroups}
              onLaunch={() => c.launch(adsAngleConfigs)}
              isLaunching={c.isLaunching}
              allChecksPass={allChecksPass}
              selectedVideos={c.selectedVideosForPreview}
              selectedImages={c.selectedImagesForPreview}
              redtrackData={c.redtrackData}
              redtrackLoading={c.redtrackLoading}
              launchResult={c.launchResult}
              mediaCounts={c.mediaCounts}
              launchStatusActive={c.launchStatusActive}
              onToggleLaunchStatusActive={c.toggleLaunchStatusActive}
              websiteUrlFromRedtrack={c.websiteUrlFromRedtrack}
              simplified
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
