/**
 * mapToFbLaunchInput - Input Mapper for FB Launch Runner
 *
 * Maps the controller state from useCampaignLaunchController to the
 * FbLaunchInput format expected by fbLaunchRunner.
 *
 * This bridges the existing UI data model with the new pipeline system.
 */

import type { FbLaunchInput, FbLaunchMediaInput, FbLaunchOptions } from '../fbLaunchRunner';
import type { CampaignConfig, AdSetConfig, AdCreativeConfig } from '../fbLaunchApi';

// =============================================================================
// INPUT TYPES (from controller)
// =============================================================================

export interface MapperVideoInput {
  id: string;
  name: string;
  creativeLink?: string; // Cloudflare URL
  fbVideoId?: string | null; // Pre-uploaded video ID from library check
}

export interface MapperImageInput {
  id: string;
  name: string;
  thumbnailUrl?: string;
  image_drive_link?: string; // Cloudflare URL
}

export interface MapperDraftInput {
  name: string;
  adAccountId: string | null;
  pageId: string | null;
  pixelId: string | null;
  budget: string;
  geo: string;
  startDate: string;
  startTime: string;
  websiteUrl: string;
  utms: string;
  ctaOverride: string;
  primaryTexts: string[];
  headlines: string[];
  descriptions: string[];
}

export interface MapperProfileInput {
  id: string;
  permanentToken: string;
  profileName?: string;
}

export interface MapperAdPresetInput {
  id: string;
  name: string;
  primaryTexts: string[];
  headlines: string[];
  descriptions: string[];
  callToAction?: string;
  /** EU DSA compliance: beneficiary name */
  beneficiaryName?: string;
  /** EU DSA compliance: payor name */
  payerName?: string;
}

export interface MapToFbLaunchInputParams {
  draft: MapperDraftInput;
  selectedVideos: MapperVideoInput[];
  selectedImages: MapperImageInput[];
  profile: MapperProfileInput;
  selectedPreset?: MapperAdPresetInput | null;
  reuseCreatives: boolean;
  launchStatusActive: boolean;
  /** IANA timezone of the target ad account (e.g. "Asia/Bangkok"). Used to
   * interpret the start date/time. Falls back to GMT+7 when omitted. */
  adAccountTimezone?: string | null;
  options?: Partial<FbLaunchOptions>;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Convert CTA display value to Facebook API format
 * "Learn More" -> "LEARN_MORE"
 * "Shop Now" -> "SHOP_NOW"
 */
function toFacebookCta(cta: string): string {
  return cta.toUpperCase().replace(/\s+/g, '_');
}

/**
 * Default timezone used when an ad account has no timezone of its own.
 * Most accounts run on GMT+7 (Bangkok), so we fall back to that rather than
 * silently using the operator's browser timezone.
 */
export const DEFAULT_AD_ACCOUNT_TIMEZONE = 'Asia/Bangkok';

/**
 * Offset (in milliseconds) of an IANA timezone relative to UTC at a given instant.
 * Computed via Intl so it stays correct across DST transitions.
 */
function getTimeZoneOffsetMs(timeZone: string, date: Date): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const parts = dtf.formatToParts(date);
  const map: Record<string, number> = {};
  for (const p of parts) {
    if (p.type !== 'literal') map[p.type] = Number(p.value);
  }

  const asUtc = Date.UTC(map.year, map.month - 1, map.day, map.hour, map.minute, map.second);
  return asUtc - date.getTime();
}

/**
 * Parse start time from date and time strings.
 *
 * The entered date/time is interpreted as a wall-clock time in the ad account's
 * timezone (NOT the operator's browser timezone), so the campaign goes live when
 * the operator expects in the account's own clock. Falls back to GMT+7 (Bangkok)
 * when the account timezone is unknown.
 *
 * Returns Unix timestamp in seconds, or null for immediate start.
 */
function parseStartTime(
  startDate: string,
  startTime: string,
  timeZone: string = DEFAULT_AD_ACCOUNT_TIMEZONE,
): number | null {
  if (!startDate) return null;

  const timeStr = startTime || '00:00';
  // Interpret the wall-clock string as UTC first, then shift by the account's
  // offset at that instant to recover the true absolute moment.
  const asIfUtc = new Date(`${startDate}T${timeStr}:00Z`);
  if (isNaN(asIfUtc.getTime())) return null;

  let offsetMs: number;
  try {
    offsetMs = getTimeZoneOffsetMs(timeZone, asIfUtc);
  } catch {
    // Invalid timezone string → fall back to GMT+7.
    offsetMs = getTimeZoneOffsetMs(DEFAULT_AD_ACCOUNT_TIMEZONE, asIfUtc);
  }

  return Math.floor((asIfUtc.getTime() - offsetMs) / 1000);
}

/**
 * Parse geo string into array of country codes
 */
function parseGeoTargets(geo: string): string[] {
  if (!geo) return ['US']; // Default to US

  return geo
    .split(/[,\s]+/)
    .map(g => g.trim().toUpperCase())
    .filter(Boolean);
}

/**
 * Parse budget string to cents
 */
function parseBudgetToCents(budget: string): number {
  const parsed = parseFloat(budget || '50');
  return Math.round(parsed * 100);
}

// =============================================================================
// MAIN MAPPER
// =============================================================================

/**
 * Map controller state to FbLaunchInput format
 */
export function mapToFbLaunchInput(params: MapToFbLaunchInputParams): FbLaunchInput {
  const {
    draft,
    selectedVideos,
    selectedImages,
    profile,
    selectedPreset,
    reuseCreatives,
    launchStatusActive,
    adAccountTimezone,
    options: customOptions,
  } = params;

  // Validate required fields
  if (!draft.adAccountId) {
    throw new Error('Ad account ID is required');
  }
  if (!draft.pageId) {
    throw new Error('Page ID is required');
  }
  if (!draft.pixelId) {
    throw new Error('Pixel ID is required');
  }
  if (!profile.permanentToken) {
    throw new Error('Access token is required');
  }

  // Determine status based on launch mode
  const status = launchStatusActive ? 'ACTIVE' : 'PAUSED';

  // Build campaign config
  const campaign: CampaignConfig = {
    name: draft.name || 'Untitled Campaign',
    objective: 'OUTCOME_SALES',
    status,
    specialAdCategories: [],
    dailyBudget: parseBudgetToCents(draft.budget),
    bidStrategy: 'LOWEST_COST_WITHOUT_CAP',
  };

  // Build ad set config
  const geoTargets = parseGeoTargets(draft.geo);
  const startTime = parseStartTime(draft.startDate, draft.startTime, adAccountTimezone ?? undefined);

  const adSet: AdSetConfig = {
    name: `${draft.name || 'Campaign'} - AdSet`,
    optimizationGoal: 'OFFSITE_CONVERSIONS',
    billingEvent: 'IMPRESSIONS',
    status,
    targeting: {
      geoLocations: { countries: geoTargets },
      ageMin: 18,
      ageMax: 65,
    },
    promotedObject: {
      customEventType: 'PURCHASE',
    },
    startTime,
    // DSA compliance
    beneficiaryName: selectedPreset?.beneficiaryName,
    payerName: selectedPreset?.payerName,
  };

  // Build ad creative config
  // Use draft texts if available, otherwise fall back to preset, then defaults
  const primaryTexts = draft.primaryTexts.length > 0
    ? draft.primaryTexts
    : (selectedPreset?.primaryTexts?.length ? selectedPreset.primaryTexts : ['Check this out!']);

  const headlines = draft.headlines.length > 0
    ? draft.headlines
    : (selectedPreset?.headlines?.length ? selectedPreset.headlines : ['Learn More']);

  const descriptions = draft.descriptions.length > 0
    ? draft.descriptions
    : (selectedPreset?.descriptions?.length ? selectedPreset.descriptions : ['Discover more']);

  const callToAction = toFacebookCta(draft.ctaOverride || selectedPreset?.callToAction || 'SHOP_NOW');

  const adCreative: AdCreativeConfig = {
    websiteUrl: draft.websiteUrl || 'https://example.com',
    urlTags: draft.utms || '',
    callToAction,
    bodies: primaryTexts,
    titles: headlines,
    descriptions,
    advantagePlusCreative: true,
    beneficiaryName: selectedPreset?.beneficiaryName,
    payerName: selectedPreset?.payerName,
    status,
  };

  // Build media array
  const media: FbLaunchMediaInput[] = [];

  // Add videos
  for (const video of selectedVideos) {
    if (!video.creativeLink) continue;

    media.push({
      type: 'video',
      name: video.name,
      url: video.creativeLink,
      fallbackUrl: video.creativeLink, // Same URL for fallback (Cloudflare is reliable)
      fbVideoId: video.fbVideoId || null, // Use pre-uploaded ID if available
    });
  }

  // Add images
  for (const image of selectedImages) {
    const imageUrl = image.image_drive_link || image.thumbnailUrl;
    if (!imageUrl) continue;

    media.push({
      type: 'image',
      name: image.name,
      url: imageUrl,
      fallbackUrl: imageUrl,
    });
  }

  // Build options
  const options: FbLaunchOptions = {
    checkLibraryFirst: reuseCreatives,
    forceReupload: false,
    uploadBatchSize: 10,
    adBatchSize: 25,
    tickIntervalMs: 10000,
    maxTicks: 15,
    maxRetries: 3,
    ...customOptions,
  };

  return {
    accessToken: profile.permanentToken,
    adAccountId: draft.adAccountId,
    pageId: draft.pageId,
    pixelId: draft.pixelId,
    campaign,
    adSet,
    adCreative,
    media,
    options,
  };
}

export default mapToFbLaunchInput;
