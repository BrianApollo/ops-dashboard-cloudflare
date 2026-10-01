/**
 * useLaunchCloneCampaign
 *
 * Clone an already-launched campaign of the same product into the launcher:
 * - Setup fields (RedTrack, preset, ad account/page/pixel, budget, geo, CTA,
 *   website URL, UTMs, display link, link variable, launch time)
 * - Profile, reuse-creatives and launch-as-active toggles
 * - Videos, AI videos and images that were used in the source campaign
 *
 * Draft fields saved on the campaign record win; the Launched Data snapshot
 * fills anything missing (e.g. campaigns imported from Facebook).
 * The current campaign's name and start date are kept.
 */

import { useMemo, useCallback } from 'react';
import type { Campaign } from '../types';
import type {
  CampaignDraft,
  LaunchSnapshot,
  MediaUsageFilter,
  SelectableVideo,
  SelectableImage,
} from './types';

// =============================================================================
// TYPES
// =============================================================================

export interface CloneCandidate {
  id: string;
  name: string;
  /** True when the campaign was launched but has since been paused ("Cancelled"). */
  paused: boolean;
  launchedAt?: string;
  adAccountName?: string;
  redtrackName?: string;
  budget?: number;
  geo?: string;
  videoCount: number;
  imageCount: number;
}

export interface CloneResult {
  sourceName: string;
  videosSelected: number;
  imagesSelected: number;
  videosMissing: number;
  imagesMissing: number;
}

export interface UseLaunchCloneCampaignOptions {
  campaigns: Campaign[];
  currentCampaignId: string;
  productId: string | undefined;
  allVideos: SelectableVideo[];
  allImages: SelectableImage[];
  setDraft: React.Dispatch<React.SetStateAction<CampaignDraft>>;
  setSelectedProfileId: (id: string) => void;
  setReuseCreatives: (v: boolean) => void;
  setLaunchStatusActive: (v: boolean) => void;
  setSelectedVideoIds: (ids: Set<string>) => void;
  setSelectedImageIds: (ids: Set<string>) => void;
  setMediaUsageFilter: (value: MediaUsageFilter) => void;
}

export interface UseLaunchCloneCampaignReturn {
  cloneCandidates: CloneCandidate[];
  cloneFromCampaign: (sourceCampaignId: string) => CloneResult | null;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * A campaign counts as launched only when it actually exists on Facebook:
 * the FB Campaign ID is written on a successful launch (or manual FB link).
 * Status alone is not enough - it is editable, and pausing a campaign on the
 * view page flips it to "Cancelled" even though it was launched.
 */
function isLaunchedCampaign(c: Campaign): boolean {
  return !!c.fbCampaignId?.trim() && c.status !== 'Preparing';
}

function parseSnapshot(raw: string | undefined): LaunchSnapshot | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LaunchSnapshot;
  } catch {
    return null;
  }
}

/** Keys (record IDs, or names for older snapshots) of every media item the source used. */
function sourceMediaKeys(campaign: Campaign, snapshot: LaunchSnapshot | null) {
  const videoKeys = new Set<string>([
    ...(campaign.videoIds ?? []),
    ...(campaign.aiVideoIds ?? []),
    ...(snapshot?.media?.videos?.succeeded ?? []).map((m) => m.localId),
  ]);
  const imageKeys = new Set<string>([
    ...(campaign.imageIds ?? []),
    ...(snapshot?.media?.images?.succeeded ?? []).map((m) => m.localId),
  ]);
  return { videoKeys, imageKeys };
}

/** Resolve source keys against the product's media, matching by ID or name. */
function resolveMedia<T extends { id: string; name: string }>(keys: Set<string>, pool: T[]) {
  const matched = pool.filter((m) => keys.has(m.id) || keys.has(m.name));
  const matchedKeys = new Set(matched.flatMap((m) => [m.id, m.name]));
  // Keys from link fields and snapshot can refer to the same item (ID + name),
  // so count unmatched keys only.
  const missing = [...keys].filter((k) => !matchedKeys.has(k)).length;
  return { ids: new Set(matched.map((m) => m.id)), missing };
}

// =============================================================================
// HOOK
// =============================================================================

export function useLaunchCloneCampaign({
  campaigns,
  currentCampaignId,
  productId,
  allVideos,
  allImages,
  setDraft,
  setSelectedProfileId,
  setReuseCreatives,
  setLaunchStatusActive,
  setSelectedVideoIds,
  setSelectedImageIds,
  setMediaUsageFilter,
}: UseLaunchCloneCampaignOptions): UseLaunchCloneCampaignReturn {
  // Launched campaigns of the same product, newest first
  const sources = useMemo(() => {
    if (!productId) return [];
    return campaigns
      .filter((c) => isLaunchedCampaign(c) && c.product.id === productId && c.id !== currentCampaignId)
      .map((campaign) => ({ campaign, snapshot: parseSnapshot(campaign.launchedData) }))
      .sort((a, b) => {
        const at = a.snapshot?.launchedAt || a.campaign.launchDate || a.campaign.createdAt;
        const bt = b.snapshot?.launchedAt || b.campaign.launchDate || b.campaign.createdAt;
        return (bt ?? '').localeCompare(at ?? '');
      });
  }, [campaigns, productId, currentCampaignId]);

  const cloneCandidates = useMemo((): CloneCandidate[] => {
    return sources.map(({ campaign: c, snapshot: s }) => {
      const { videoKeys, imageKeys } = sourceMediaKeys(c, s);
      return {
        id: c.id,
        name: c.name,
        paused: c.status === 'Cancelled',
        launchedAt: s?.launchedAt || c.launchDate,
        adAccountName: s?.facebook?.adAccount?.name || c.adAccUsed || c.fbAdAccountId,
        redtrackName: c.redTrackName || s?.redtrack?.campaignName,
        budget: c.budget ?? s?.config?.budget,
        geo: c.locationTargeting || s?.config?.geo?.join(', '),
        videoCount: resolveMedia(videoKeys, allVideos).ids.size,
        imageCount: resolveMedia(imageKeys, allImages).ids.size,
      };
    });
  }, [sources, allVideos, allImages]);

  const cloneFromCampaign = useCallback((sourceCampaignId: string): CloneResult | null => {
    const source = sources.find((s) => s.campaign.id === sourceCampaignId);
    if (!source) return null;
    const { campaign: c, snapshot: s } = source;
    const fb = s?.facebook;
    const config = s?.config;

    // Setup fields. Written with setDraft (not updateDraft) so the ad account
    // change does not wipe the page and pixel we are setting alongside it.
    const budget = c.budget ?? config?.budget;
    setDraft((prev: CampaignDraft) => ({
      ...prev,
      redtrackCampaignId: c.redtrackCampaignId || s?.redtrack?.campaignId || '',
      redtrackCampaignName: c.redTrackName || s?.redtrack?.campaignName || '',
      adPresetId: c.selectedAdProfile || s?.adPreset?.id || prev.adPresetId,
      adAccountId: c.adAccUsed || c.fbAdAccountId || fb?.adAccount?.id || null,
      pageId: c.pageUsed || fb?.page?.id || null,
      pixelId: c.pixelUsed || fb?.pixel?.id || null,
      startTime: c.launchTime || config?.startTime || prev.startTime,
      budget: budget !== undefined ? String(budget) : prev.budget,
      geo: c.locationTargeting || config?.geo?.join(', ') || prev.geo,
      ctaOverride: c.cta || config?.ctaOverride || prev.ctaOverride,
      websiteUrl: c.websiteUrl || config?.websiteUrl || '',
      utms: c.utms || config?.utms || '',
      displayLink: c.displayLink || config?.displayLink || '',
      linkVariable: c.linkVariable || '',
    }));

    const profileId = c.draftProfileId || c.launchProfileId || fb?.profile?.id;
    if (profileId) setSelectedProfileId(profileId);
    if (c.reuseCreatives !== undefined) setReuseCreatives(c.reuseCreatives);
    const launchAsActive = c.launchAsActive ?? (config ? config.launchStatus === 'ACTIVE' : undefined);
    if (launchAsActive !== undefined) setLaunchStatusActive(launchAsActive);

    // Media
    const { videoKeys, imageKeys } = sourceMediaKeys(c, s);
    const videos = resolveMedia(videoKeys, allVideos);
    const images = resolveMedia(imageKeys, allImages);
    setSelectedVideoIds(videos.ids);
    setSelectedImageIds(images.ids);
    // Cloned creatives are already used - show them in the picker.
    if (videos.ids.size > 0 || images.ids.size > 0) setMediaUsageFilter('used');

    return {
      sourceName: c.name,
      videosSelected: videos.ids.size,
      imagesSelected: images.ids.size,
      videosMissing: videos.missing,
      imagesMissing: images.missing,
    };
  }, [
    sources, allVideos, allImages, setDraft, setSelectedProfileId, setReuseCreatives,
    setLaunchStatusActive, setSelectedVideoIds, setSelectedImageIds, setMediaUsageFilter,
  ]);

  return { cloneCandidates, cloneFromCampaign };
}
