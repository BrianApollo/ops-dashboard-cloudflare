/**
 * Build a LaunchSnapshot from live Facebook data.
 *
 * For campaigns launched outside the Launcher (linked from the Manage page),
 * so the Launch Data tab has real content. Output is flagged
 * `importedFromFacebook` so it can be told apart from real launches.
 */

import { fbGet } from './api';
import { getFbObjectNames } from '../campaigns';
import type { LaunchSnapshot, LaunchSnapshotMedia } from '../campaigns/launch/types';

// =============================================================================
// RAW GRAPH TYPES (only the fields read here)
// =============================================================================

interface CtaSpec {
  type?: string;
  value?: { link?: string };
}

interface RawCreative {
  id: string;
  thumbnail_url?: string;
  image_url?: string;
  video_id?: string;
  url_tags?: string;
  object_story_spec?: {
    page_id?: string;
    video_data?: {
      video_id?: string;
      image_url?: string;
      message?: string;
      title?: string;
      link_description?: string;
      call_to_action?: CtaSpec;
    };
    link_data?: {
      picture?: string;
      image_hash?: string;
      link?: string;
      message?: string;
      name?: string;
      description?: string;
      call_to_action?: CtaSpec;
    };
  };
  asset_feed_spec?: {
    bodies?: Array<{ text: string }>;
    titles?: Array<{ text: string }>;
    descriptions?: Array<{ text: string }>;
    link_urls?: Array<{ website_url?: string }>;
    call_to_action_types?: string[];
    videos?: Array<{ video_id?: string; thumbnail_url?: string }>;
    images?: Array<{ hash?: string; url?: string }>;
  };
}

interface RawAd {
  id: string;
  name: string;
  creative?: RawCreative;
}

interface RawAdSet {
  id: string;
  name: string;
  status: string;
  daily_budget?: string;
  lifetime_budget?: string;
  start_time?: string;
  promoted_object?: { pixel_id?: string };
  targeting?: { geo_locations?: { countries?: string[] } };
}

interface RawCampaign {
  id: string;
  name: string;
  status: string;
  daily_budget?: string;
  lifetime_budget?: string;
  created_time: string;
}

// =============================================================================
// HELPERS
// =============================================================================

async function fbGetAll<T>(endpoint: string, accessToken: string, fields: string): Promise<T[]> {
  const all: T[] = [];
  let after: string | undefined;
  do {
    const params: Record<string, string> = { fields, limit: '100' };
    if (after) params.after = after;
    const res = await fbGet<{ data: T[]; paging?: { cursors?: { after?: string }; next?: string } }>(
      endpoint,
      accessToken,
      params,
    );
    all.push(...(res.data || []));
    after = res.paging?.next ? res.paging.cursors?.after : undefined;
  } while (after);
  return all;
}

/** Unique, non-blank strings in first-seen order. */
function uniq(values: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const t = v?.trim();
    if (t && !seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
  }
  return out;
}

async function safeNames(ids: string[], accessToken: string): Promise<Record<string, string>> {
  try {
    return await getFbObjectNames(ids, accessToken);
  } catch {
    return {};
  }
}

const CREATIVE_FIELDS =
  'id,thumbnail_url,image_url,video_id,url_tags,object_story_spec,asset_feed_spec';

// =============================================================================
// BUILDER
// =============================================================================

export interface BuildSnapshotParams {
  fbCampaignId: string;
  adAccountId: string;
  accessToken: string;
  profile: { id: string; name: string };
  redtrack?: { campaignId: string; campaignName?: string };
}

export async function buildSnapshotFromFacebook({
  fbCampaignId,
  adAccountId,
  accessToken,
  profile,
  redtrack,
}: BuildSnapshotParams): Promise<LaunchSnapshot> {
  const [campaign, adSets, ads, adAccount] = await Promise.all([
    fbGet<RawCampaign>(fbCampaignId, accessToken, {
      fields: 'id,name,status,daily_budget,lifetime_budget,created_time',
    }),
    fbGetAll<RawAdSet>(
      `${fbCampaignId}/adsets`,
      accessToken,
      'id,name,status,daily_budget,lifetime_budget,start_time,promoted_object,targeting{geo_locations}',
    ),
    fbGetAll<RawAd>(`${fbCampaignId}/ads`, accessToken, `id,name,creative{${CREATIVE_FIELDS}}`),
    fbGet<{ id: string; name?: string }>(adAccountId, accessToken, { fields: 'name' }).catch(() => null),
  ]);

  // Snapshot holds one ad set — prefer an active one
  const adSet = adSets.find((s) => s.status === 'ACTIVE') ?? adSets[0];
  const creatives = ads.map((a) => a.creative).filter((c): c is RawCreative => !!c);
  const first = creatives[0];
  const oss = first?.object_story_spec;
  const mediaData = oss?.video_data ?? oss?.link_data;

  const pageId = uniq(creatives.map((c) => c.object_story_spec?.page_id))[0] ?? '';
  const pixelId = adSet?.promoted_object?.pixel_id ?? '';
  const [pageNames, pixelNames] = await Promise.all([
    safeNames(pageId ? [pageId] : [], accessToken),
    safeNames(pixelId ? [pixelId] : [], accessToken),
  ]);

  // Budget: campaign (CBO) first, then the ad set
  const budgetCents = parseInt(
    campaign.daily_budget || adSet?.daily_budget || campaign.lifetime_budget || adSet?.lifetime_budget || '0',
    10,
  );

  // Copy across all ads (asset feed + plain story spec)
  const primaryTexts = uniq(creatives.flatMap((c) => [
    ...(c.asset_feed_spec?.bodies?.map((b) => b.text) ?? []),
    c.object_story_spec?.video_data?.message,
    c.object_story_spec?.link_data?.message,
  ]));
  const headlines = uniq(creatives.flatMap((c) => [
    ...(c.asset_feed_spec?.titles?.map((t) => t.text) ?? []),
    c.object_story_spec?.video_data?.title,
    c.object_story_spec?.link_data?.name,
  ]));
  const descriptions = uniq(creatives.flatMap((c) => [
    ...(c.asset_feed_spec?.descriptions?.map((d) => d.text) ?? []),
    c.object_story_spec?.video_data?.link_description,
    c.object_story_spec?.link_data?.description,
  ]));

  const callToAction =
    mediaData?.call_to_action?.type ?? first?.asset_feed_spec?.call_to_action_types?.[0];
  const websiteUrl =
    uniq([
      mediaData?.call_to_action?.value?.link,
      oss?.link_data?.link,
      first?.asset_feed_spec?.link_urls?.[0]?.website_url,
    ])[0] ?? '';

  // One media entry per ad
  const videos: LaunchSnapshotMedia[] = [];
  const images: LaunchSnapshotMedia[] = [];
  for (const ad of ads) {
    const c = ad.creative;
    const videoId =
      c?.object_story_spec?.video_data?.video_id ?? c?.video_id ?? c?.asset_feed_spec?.videos?.[0]?.video_id;
    const entry: LaunchSnapshotMedia = {
      localId: ad.id,
      name: ad.name,
      adId: ad.id,
      thumbnailUrl: c?.thumbnail_url,
    };
    if (videoId) {
      videos.push({ ...entry, fbMediaId: videoId });
    } else {
      images.push({
        ...entry,
        fbMediaId: c?.object_story_spec?.link_data?.image_hash ?? c?.asset_feed_spec?.images?.[0]?.hash,
        imageUrl: c?.object_story_spec?.link_data?.picture ?? c?.image_url ?? c?.asset_feed_spec?.images?.[0]?.url ?? c?.thumbnail_url,
      });
    }
  }

  const start = adSet?.start_time;
  const now = new Date().toISOString();

  return {
    version: 1,
    launchedAt: campaign.created_time,
    importedFromFacebook: true,
    config: {
      campaignName: campaign.name,
      budget: budgetCents / 100,
      budgetCents,
      geo: adSet?.targeting?.geo_locations?.countries ?? [],
      startDate: start?.slice(0, 10),
      startTime: start?.slice(11, 16),
      websiteUrl,
      utms: first?.url_tags || undefined,
      ctaOverride: callToAction,
      launchStatus: campaign.status === 'ACTIVE' ? 'ACTIVE' : 'PAUSED',
    },
    facebook: {
      adAccount: { id: adAccountId, name: adAccount?.name ?? '' },
      page: { id: pageId, name: pageNames[pageId] ?? '' },
      pixel: { id: pixelId, name: pixelNames[pixelId] ?? '' },
      campaign: { id: campaign.id, name: campaign.name },
      profile,
      adSet: adSet ? { id: adSet.id, name: adSet.name } : undefined,
      adIds: ads.map((a) => a.id),
    },
    adPreset: {
      id: '',
      name: 'Imported from Facebook',
      primaryTexts,
      headlines,
      descriptions,
      callToAction,
    },
    redtrack,
    media: {
      summary: {
        videosAttempted: videos.length,
        videosSucceeded: videos.length,
        videosFailed: 0,
        imagesAttempted: images.length,
        imagesSucceeded: images.length,
        imagesFailed: 0,
      },
      videos: { succeeded: videos, failed: [] },
      images: { succeeded: images, failed: [] },
    },
    result: {
      success: true,
      partialSuccess: false,
      dryRun: false,
      adsAttempted: ads.length,
      adsCreated: ads.length,
      adsFailed: 0,
      completedAt: now,
      errors: [],
    },
  };
}
