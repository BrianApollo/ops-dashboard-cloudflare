/**
 * useLaunchExecution
 *
 * BRIDGE: Lifecycle bridge between LAUNCH and POST-LAUNCH phases.
 *
 * Role in lifecycle architecture:
 * - Called by useCampaignLaunchController (FACADE)
 * - Orchestrates useRunLaunchPipeline (ENGINE - launch phase)
 * - Calls writeLaunchSnapshot after success (postlaunch phase)
 * - Manages launchResult state for UI consumption
 *
 * This is the ONLY file that spans launch → postlaunch.
 * All other launch code lives under launch/.
 * All other post-launch code lives under postlaunch/.
 */

import { useState, useCallback, useEffect } from 'react';
import type { FbLaunchState } from '.';
import type { SelectableVideo, SelectableImage, CampaignDraft } from './types';
import { useRunLaunchPipeline } from './useRunLaunchPipeline';
import type { MediaCounts } from './useRunLaunchPipeline';
import { writeLaunchSnapshot } from './writeLaunchSnapshot';
import { updateVideosBatch, FIELD_USED_IN_CAMPAIGN } from '../../videos/data';
import { updateImageUsage } from '../../images/data';

// =============================================================================
// TYPES
// =============================================================================

interface AdPresetForLaunch {
  id: string;
  name: string;
  primaryTexts: string[];
  headlines: string[];
  descriptions: string[];
  callToAction: string;
  beneficiaryName: string;
  payerName: string;
}

interface ProfileForLaunch {
  id: string;
  permanentToken: string | null;
  profileName: string;
}

export interface LaunchResult {
  campaignId?: string;
  adSetId?: string;
  success: boolean;
  error?: string;
  // Tracks post-launch Airtable persistence failures
  airtableFailed?: boolean;
  airtableError?: string;
}

export { MediaCounts };

interface InfraOptionForLookup {
  id: string;
  name: string;
  /** IANA timezone of the ad account (e.g. "Asia/Bangkok"), when known */
  timezone?: string | null;
}

export interface UseLaunchOrchestratorOptions {
  campaignId: string;
  draft: CampaignDraft; // Use shared CampaignDraft type which allows nulls
  selectedProfile: ProfileForLaunch | undefined;
  availableVideos: SelectableVideo[];
  availableImages: SelectableImage[];
  selectedVideoIds: Set<string>;
  selectedImageIds: Set<string>;
  productPresets: AdPresetForLaunch[];
  reuseCreatives: boolean;
  launchStatusActive: boolean;
  redtrackTrackingParams: string | null;
  /** Facebook infra arrays for resolving names in snapshot */
  adAccounts: InfraOptionForLookup[];
  pixels: InfraOptionForLookup[];
  pages: InfraOptionForLookup[];
}

export interface UseLaunchOrchestratorReturn {
  isLaunching: boolean;
  launchResult: LaunchResult | null;
  mediaCounts: MediaCounts;
  launchProgress: FbLaunchState | null;
  launch: () => Promise<void>;
  retryItem: (name: string) => void;
}

// =============================================================================
// HOOK
// =============================================================================

export function useLaunchOrchestrator({
  campaignId,
  draft,
  selectedProfile,
  availableVideos,
  availableImages,
  selectedVideoIds,
  selectedImageIds,
  productPresets,
  reuseCreatives,
  launchStatusActive,
  redtrackTrackingParams,
  adAccounts,
  pixels,
  pages,
}: UseLaunchOrchestratorOptions): UseLaunchOrchestratorReturn {
  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------
  const [launchResult, setLaunchResult] = useState<LaunchResult | null>(null);

  // ---------------------------------------------------------------------------
  // LAUNCH PIPELINE (launch phase)
  // ---------------------------------------------------------------------------
  const pipeline = useRunLaunchPipeline();

  // ---------------------------------------------------------------------------
  // SYNC PROGRESS FROM FB LAUNCH TO LAUNCH RESULT
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (pipeline.launchProgress) {
      setLaunchResult((prev) => ({
        ...prev,
        success: pipeline.launchProgress?.phase === 'complete',
        campaignId: pipeline.launchProgress?.campaignId || prev?.campaignId,
        adSetId: pipeline.launchProgress?.adsetId || prev?.adSetId,
        error: pipeline.launchProgress?.error || prev?.error,
      }));
    }
  }, [pipeline.launchProgress]);

  // ---------------------------------------------------------------------------
  // LAUNCH FUNCTION (lifecycle bridge)
  // ---------------------------------------------------------------------------
  const launch = useCallback(async () => {
    // Get selected media
    const selectedVideos = availableVideos.filter((v) => selectedVideoIds.has(v.id));
    const selectedImages = availableImages.filter((i) => selectedImageIds.has(i.id));

    // Get selected preset
    const selectedPreset = productPresets.find((p) => p.id === draft.adPresetId) || null;

    // Resolve the target ad account's timezone so the start date/time is
    // interpreted in the account's clock (falls back to GMT+7 in the mapper).
    const adAccountTimezone =
      adAccounts.find((a) => a.id === draft.adAccountId)?.timezone ?? null;

    // Initialize result for real-time updates
    setLaunchResult({ success: false });

    try {
      // =======================================================================
      // LAUNCH PHASE: Execute FB launch pipeline
      // =======================================================================
      const { result, videosWithUrls, imagesWithUrls } = await pipeline.runLaunch({
        campaignId,
        draft,
        selectedProfile,
        selectedVideos,
        selectedImages,
        selectedPreset: selectedPreset ? {
          id: selectedPreset.id,
          name: selectedPreset.name,
          primaryTexts: selectedPreset.primaryTexts,
          headlines: selectedPreset.headlines,
          descriptions: selectedPreset.descriptions,
          callToAction: selectedPreset.callToAction,
        } : null,
        reuseCreatives,
        launchStatusActive,
        redtrackTrackingParams,
        adAccountTimezone,
      });

      // Final update with success status
      setLaunchResult({
        campaignId: result.campaignId || undefined,
        adSetId: result.adsetId || undefined,
        success: result.phase === 'complete',
        error: result.error,
      });

      // =======================================================================
      // POST-LAUNCH PHASE: Persist to Airtable
      // =======================================================================
      if (result.phase === 'complete') {
        console.log('Campaign launched successfully!');

        const snapshotResult = await writeLaunchSnapshot({
          result,
          campaignId,
          draft: {
            name: draft.name,
            adAccountId: draft.adAccountId!,
            adAccountName: adAccounts.find(a => a.id === draft.adAccountId)?.name || draft.adAccountId!,
            pageId: draft.pageId!,
            pageName: pages.find(p => p.id === draft.pageId)?.name || draft.pageId!,
            pixelId: draft.pixelId!,
            pixelName: pixels.find(p => p.id === draft.pixelId)?.name || draft.pixelId!,
            budget: draft.budget,
            geo: draft.geo,
            startDate: draft.startDate,
            startTime: draft.startTime,
            websiteUrl: draft.websiteUrl,
            utms: draft.utms,
            ctaOverride: draft.ctaOverride,
            redtrackCampaignId: draft.redtrackCampaignId,
            redtrackCampaignName: draft.redtrackCampaignName,
          },
          profile: {
            id: selectedProfile!.id,
            profileName: selectedProfile!.profileName,
          },
          preset: selectedPreset ? {
            id: selectedPreset.id,
            name: selectedPreset.name,
            primaryTexts: draft.primaryTexts,
            headlines: draft.headlines,
            descriptions: draft.descriptions,
            callToAction: selectedPreset.callToAction,
          } : undefined,
          videosWithUrls: videosWithUrls.map(v => ({
            id: v.id,
            name: v.name,
            creativeLink: v.creativeLink,
          })),
          imagesWithUrls: imagesWithUrls.map(i => ({
            id: i.id,
            name: i.name,
          })),
          launchStatusActive,
        });

        if (!snapshotResult.success) {
          // Don't fail the launch for post-launch errors, but track partial failure
          setLaunchResult(prev => ({
            ...prev,
            success: prev?.success ?? true,
            airtableFailed: true,
            airtableError: snapshotResult.error || 'Failed to save launch data',
          }));
        }
      } else if (result.phase === 'error') {
        console.error('Launch failed:', result.error);
      } else if (result.phase === 'stopped') {
        console.log('Launch was stopped by user');
      }
    } catch (err) {
      console.error('Launch error:', err);
      setLaunchResult({
        success: false,
        error: (err as Error).message,
      });
    }
  }, [campaignId, draft, selectedProfile, availableVideos, availableImages, selectedVideoIds, selectedImageIds, productPresets, reuseCreatives, launchStatusActive, redtrackTrackingParams, pipeline, adAccounts, pixels, pages]);

  // ---------------------------------------------------------------------------
  // RETRY SINGLE ITEM (with per-record Airtable update on success)
  // ---------------------------------------------------------------------------
  // When a retry succeeds we:
  //  1. Update ONLY that media's own Airtable record:
  //       - video → mark Status 'Used' and link the Airtable campaign
  //       - image → link the Airtable campaign only
  //     (all other media records are left untouched), and
  //  2. Refresh the campaign-level launch snapshot from the current state, so
  //     "Launched Data" / "Images Used" reflect the newly-succeeded item
  //     (this does NOT re-touch the other media records).
  const retryItem = useCallback((name: string) => {
    pipeline.retryItem(name, async (item, state) => {
      // --- 1. Update just the retried media's own record ---
      try {
        if (item.type === 'video') {
          const record = availableVideos.find((v) => v.name === item.name);
          if (record) {
            await updateVideosBatch([{
              id: record.id,
              fields: { [FIELD_USED_IN_CAMPAIGN]: [campaignId], Status: 'Used' },
            }]);
          }
        } else {
          const record = availableImages.find((i) => i.name === item.name);
          if (record) await updateImageUsage(record.id, campaignId);
        }
      } catch (err) {
        console.error('[retryItem] Failed to update media record after successful retry:', err);
      }

      // --- 2. Refresh the campaign-level launch data from current state ---
      if (!draft.adAccountId || !draft.pageId || !draft.pixelId || !selectedProfile) return;
      try {
        const selectedPreset = productPresets.find((p) => p.id === draft.adPresetId) || null;

        // Derive the launched media sets from the runner state (mapping names → ids)
        const videosWithUrls = state.media
          .filter((m) => m.type === 'video')
          .map((m) => {
            const rec = availableVideos.find((v) => v.name === m.name);
            return { id: rec?.id || m.name, name: m.name, creativeLink: rec?.creativeLink };
          });
        const imagesWithUrls = state.media
          .filter((m) => m.type === 'image')
          .map((m) => {
            const rec = availableImages.find((i) => i.name === m.name);
            return { id: rec?.id || m.name, name: m.name };
          });

        await writeLaunchSnapshot({
          result: state,
          campaignId,
          draft: {
            name: draft.name,
            adAccountId: draft.adAccountId,
            adAccountName: adAccounts.find((a) => a.id === draft.adAccountId)?.name || draft.adAccountId,
            pageId: draft.pageId,
            pageName: pages.find((p) => p.id === draft.pageId)?.name || draft.pageId,
            pixelId: draft.pixelId,
            pixelName: pixels.find((p) => p.id === draft.pixelId)?.name || draft.pixelId,
            budget: draft.budget,
            geo: draft.geo,
            startDate: draft.startDate,
            startTime: draft.startTime,
            websiteUrl: draft.websiteUrl,
            utms: draft.utms,
            ctaOverride: draft.ctaOverride,
            redtrackCampaignId: draft.redtrackCampaignId,
            redtrackCampaignName: draft.redtrackCampaignName,
          },
          profile: {
            id: selectedProfile.id,
            profileName: selectedProfile.profileName,
          },
          preset: selectedPreset ? {
            id: selectedPreset.id,
            name: selectedPreset.name,
            primaryTexts: draft.primaryTexts,
            headlines: draft.headlines,
            descriptions: draft.descriptions,
            callToAction: selectedPreset.callToAction,
          } : undefined,
          videosWithUrls,
          imagesWithUrls,
          launchStatusActive,
        }, { updateMediaRecords: false });
      } catch (err) {
        console.error('[retryItem] Failed to refresh campaign launch data after retry:', err);
      }
    });
  }, [
    pipeline, availableVideos, availableImages, campaignId, draft, selectedProfile,
    productPresets, adAccounts, pages, pixels, launchStatusActive,
  ]);

  // ---------------------------------------------------------------------------
  // RETURN
  // ---------------------------------------------------------------------------
  return {
    isLaunching: pipeline.isLaunching,
    launchResult,
    mediaCounts: pipeline.mediaCounts,
    launchProgress: pipeline.launchProgress,
    launch,
    retryItem,
  };
}
