/**
 * Data abstraction layer for Campaigns.
 *
 * This file is the ONLY place that knows about Airtable.
 * All Airtable field names are mapped here — nowhere else.
 *
 * Rules:
 * - Read-only for Phase 1 (no mutations)
 * - All mapping happens in mapAirtableToCampaign
 * - No filtering, sorting, or domain rules
 * - No derived logic (readiness calculated elsewhere)
 */

import type { Campaign, CampaignStatus, CampaignPlatform } from './types';
import type { LaunchSnapshot } from './launch/types';
import { listVideos } from '../videos/data';
import { listImages } from '../images/data';
import { airtableFetch } from '../../core/data/airtable-client';
import { provider } from '../../data/provider';
import type { AirtableRecord, AirtableResponse } from '../../lib/airtable-types';

// =============================================================================
// TABLE & FIELD NAMES
// =============================================================================

const CAMPAIGNS_TABLE = 'Campaigns';
const PRODUCTS_TABLE = 'Products';

// -----------------------------------------------------------------------------
// Campaigns table fields
// -----------------------------------------------------------------------------
const FIELD_CAMPAIGN_NAME = 'Name';               // Campaign name
const FIELD_CAMPAIGN_STATUS = 'Status';           // Single select: Draft, Active, Paused, Completed
const FIELD_CAMPAIGN_PRODUCT = 'Product';         // Linked record → Products
const FIELD_CAMPAIGN_PLATFORM = 'Platform';       // Single select: Facebook, Instagram, TikTok, etc.
const FIELD_CAMPAIGN_REDTRACK_NAME = 'RedTrack Campaign Name'; // Redtrack campaign name
const FIELD_CAMPAIGN_REDTRACK_ID = 'RedTrack Campaign Id'; // Redtrack campaign ID (hex)
const FIELD_CAMPAIGN_NOTES = 'Notes';             // Long text field
const FIELD_CAMPAIGN_START_DATE = 'Start Date';   // Date field
const FIELD_CAMPAIGN_END_DATE = 'End Date';       // Date field
const FIELD_CAMPAIGN_BUDGET = 'Budget';           // Currency/number field
const FIELD_CAMPAIGN_DESCRIPTION = 'Description'; // Long text field
const FIELD_VIDEOS_USED = 'Videos Used In This Campaign';
const FIELD_IMAGES_USED = 'Images Used In This Campaign';

// Launch data fields (populated after successful Facebook launch)
const FIELD_FB_CAMPAIGN_ID = 'FB Campaign ID';       // Facebook campaign ID
const FIELD_FB_AD_ACCOUNT_ID = 'FB Ad Account ID';   // Facebook ad account ID
const FIELD_FB_AD_SET_ID = 'FB Ad Set ID';           // Facebook ad set ID
const FIELD_FB_AD_IDS = 'FB Ad IDs';                 // Facebook ad IDs (JSON array)
const FIELD_LAUNCH_PROFILE_ID = 'Launch Profile ID'; // Profile ID used for launch
const FIELD_LAUNCHED_DATA = 'Launched Data';         // Full JSON snapshot
const FIELD_LAUNCHED_AT = 'Launch Date';             // Timestamp when launched

// Draft fields (populated when saving draft)
const FIELD_LAUNCH_DATE = 'Launch Date';             // Date field
const FIELD_LAUNCH_TIME = 'Launch Time';             // Text field (HH:MM)
const FIELD_LOCATION_TARGETING = 'Location Targeting'; // Text field
const FIELD_WEBSITE_URL = 'Website Url';             // URL field
const FIELD_UTMS = 'UTMs';                           // Text field
const FIELD_AD_ACC_USED = 'Ad Acc Used';             // Text field
const FIELD_PAGE_USED = 'Page Used';                 // Text field
const FIELD_PIXEL_USED = 'Pixel Used';               // Text field
const FIELD_SELECTED_AD_PROFILE = 'Selected Ad Profile'; // Text field
const FIELD_CTA = 'CTA';                             // Text field
const FIELD_DISPLAY_LINK = 'Display Link';           // Text field
const FIELD_REUSE_CREATIVES = 'Reuse Creatives';     // Checkbox field
const FIELD_LAUNCH_AS_ACTIVE = 'Launch As Active';   // Checkbox field
const FIELD_LINK_VARIABLE = 'Link Variable';         // Text field
const FIELD_DRAFT_PROFILE = 'Profile ID';            // Text field (selected profile for launch setup)

// Products table fields
const FIELD_PRODUCT_NAME = 'Product Name';

// =============================================================================
// AIRTABLE TYPES
// =============================================================================


// =============================================================================
// STATUS NORMALIZATION
// =============================================================================

/**
 * Normalizes Airtable status values to domain status.
 * Returns the raw value if it matches, otherwise defaults to 'Preparing'.
 */
function normalizeStatus(rawStatus: string | undefined): CampaignStatus {
  if (!rawStatus) return 'Preparing';

  // Direct match (case-insensitive)
  const normalized = rawStatus.toLowerCase();
  if (normalized === 'preparing') return 'Preparing';
  if (normalized === 'launched') return 'Launched';
  if (normalized === 'cancelled') return 'Cancelled';

  // Default to Preparing for unknown values
  return 'Preparing';
}

/**
 * Normalizes Airtable platform values to domain platform.
 */
function normalizePlatform(rawPlatform: string | undefined): CampaignPlatform | undefined {
  if (!rawPlatform) return undefined;

  const platformMap: Record<string, CampaignPlatform> = {
    'facebook': 'facebook',
    'fb': 'facebook',
    'instagram': 'instagram',
    'ig': 'instagram',
    'tiktok': 'tiktok',
    'tt': 'tiktok',
    'youtube': 'youtube',
    'yt': 'youtube',
    'google': 'google',
    'google ads': 'google',
    'other': 'other',
  };

  const normalized = rawPlatform.toLowerCase();
  return platformMap[normalized] ?? 'other';
}

// =============================================================================
// MAPPER
// =============================================================================

/**
 * Maps an Airtable record to Campaign domain model.
 */
function mapAirtableToCampaign(
  record: AirtableRecord,
  productsMap: Map<string, { id: string; name: string }>
): Campaign | null {
  const fields = record.fields;

  // Required: Campaign name
  const name = typeof fields[FIELD_CAMPAIGN_NAME] === 'string'
    ? fields[FIELD_CAMPAIGN_NAME]
    : null;

  if (!name) {
    return null;
  }

  // Status
  const rawStatus = typeof fields[FIELD_CAMPAIGN_STATUS] === 'string'
    ? fields[FIELD_CAMPAIGN_STATUS]
    : undefined;
  const status = normalizeStatus(rawStatus);

  // Product (linked record)
  const productIds = fields[FIELD_CAMPAIGN_PRODUCT] as string[] | undefined;
  const productId = productIds?.[0];
  const product = productId && productsMap.has(productId)
    ? productsMap.get(productId)!
    : { id: 'unknown', name: 'Unknown Product' };

  // Platform
  const rawPlatform = typeof fields[FIELD_CAMPAIGN_PLATFORM] === 'string'
    ? fields[FIELD_CAMPAIGN_PLATFORM]
    : undefined;
  const platform = normalizePlatform(rawPlatform);

  // RedTrack Name
  const redTrackName = typeof fields[FIELD_CAMPAIGN_REDTRACK_NAME] === 'string'
    ? fields[FIELD_CAMPAIGN_REDTRACK_NAME]
    : undefined;

  // RedTrack Campaign ID
  const redtrackCampaignId = typeof fields[FIELD_CAMPAIGN_REDTRACK_ID] === 'string'
    ? fields[FIELD_CAMPAIGN_REDTRACK_ID]
    : undefined;

  // Notes
  const notes = typeof fields[FIELD_CAMPAIGN_NOTES] === 'string'
    ? fields[FIELD_CAMPAIGN_NOTES]
    : undefined;

  // Dates
  const startDate = typeof fields[FIELD_CAMPAIGN_START_DATE] === 'string'
    ? fields[FIELD_CAMPAIGN_START_DATE]
    : undefined;

  const endDate = typeof fields[FIELD_CAMPAIGN_END_DATE] === 'string'
    ? fields[FIELD_CAMPAIGN_END_DATE]
    : undefined;

  // Budget
  const budget = typeof fields[FIELD_CAMPAIGN_BUDGET] === 'number'
    ? fields[FIELD_CAMPAIGN_BUDGET]
    : undefined;

  // Description
  const description = typeof fields[FIELD_CAMPAIGN_DESCRIPTION] === 'string'
    ? fields[FIELD_CAMPAIGN_DESCRIPTION]
    : undefined;

  // Launch data (populated after successful Facebook launch)
  const fbCampaignId = typeof fields[FIELD_FB_CAMPAIGN_ID] === 'string'
    ? fields[FIELD_FB_CAMPAIGN_ID]
    : undefined;

  const fbAdAccountId = typeof fields[FIELD_FB_AD_ACCOUNT_ID] === 'string'
    ? fields[FIELD_FB_AD_ACCOUNT_ID]
    : undefined;

  const launchProfileId = typeof fields[FIELD_LAUNCH_PROFILE_ID] === 'string'
    ? fields[FIELD_LAUNCH_PROFILE_ID]
    : undefined;

  const launchedData = typeof fields[FIELD_LAUNCHED_DATA] === 'string'
    ? fields[FIELD_LAUNCHED_DATA]
    : undefined;

  // Draft fields
  const launchDate = typeof fields[FIELD_LAUNCH_DATE] === 'string'
    ? fields[FIELD_LAUNCH_DATE]
    : undefined;

  const launchTime = typeof fields[FIELD_LAUNCH_TIME] === 'string'
    ? fields[FIELD_LAUNCH_TIME]
    : undefined;

  const locationTargeting = typeof fields[FIELD_LOCATION_TARGETING] === 'string'
    ? fields[FIELD_LOCATION_TARGETING]
    : undefined;

  const websiteUrl = typeof fields[FIELD_WEBSITE_URL] === 'string'
    ? fields[FIELD_WEBSITE_URL]
    : undefined;

  const utms = typeof fields[FIELD_UTMS] === 'string'
    ? fields[FIELD_UTMS]
    : undefined;

  const adAccUsed = typeof fields[FIELD_AD_ACC_USED] === 'string'
    ? fields[FIELD_AD_ACC_USED]
    : undefined;

  const pageUsed = typeof fields[FIELD_PAGE_USED] === 'string'
    ? fields[FIELD_PAGE_USED]
    : undefined;

  const pixelUsed = typeof fields[FIELD_PIXEL_USED] === 'string'
    ? fields[FIELD_PIXEL_USED]
    : undefined;

  // Selected Ad Profile is a linked record, extract first ID
  const selectedAdProfileIds = fields[FIELD_SELECTED_AD_PROFILE] as string[] | undefined;
  const selectedAdProfile = selectedAdProfileIds?.[0];

  const cta = typeof fields[FIELD_CTA] === 'string'
    ? fields[FIELD_CTA]
    : undefined;

  const displayLink = typeof fields[FIELD_DISPLAY_LINK] === 'string'
    ? fields[FIELD_DISPLAY_LINK]
    : undefined;

  const linkVariable = typeof fields[FIELD_LINK_VARIABLE] === 'string'
    ? fields[FIELD_LINK_VARIABLE]
    : undefined;

  const draftProfileId = typeof fields[FIELD_DRAFT_PROFILE] === 'string'
    ? fields[FIELD_DRAFT_PROFILE]
    : undefined;

  const reuseCreatives = typeof fields[FIELD_REUSE_CREATIVES] === 'boolean'
    ? fields[FIELD_REUSE_CREATIVES]
    : undefined;

  const launchAsActive = typeof fields[FIELD_LAUNCH_AS_ACTIVE] === 'boolean'
    ? fields[FIELD_LAUNCH_AS_ACTIVE]
    : undefined;

  return {
    id: record.id,
    name,
    status,
    product,
    platform,
    redTrackName,
    redtrackCampaignId,
    notes,
    startDate,
    endDate,
    budget,
    description,
    fbCampaignId,
    fbAdAccountId,
    launchProfileId,
    launchedData,
    // Draft fields
    launchDate,
    launchTime,
    locationTargeting,
    websiteUrl,
    utms,
    adAccUsed,
    pageUsed,
    pixelUsed,
    selectedAdProfile,
    cta,
    displayLink,
    linkVariable,
    draftProfileId,
    reuseCreatives,
    launchAsActive,
    createdAt: record.createdTime,
  };
}

// =============================================================================
// REFERENCE DATA FETCHERS
// =============================================================================

let productsCache: Map<string, { id: string; name: string }> | null = null;

async function fetchProducts(): Promise<Map<string, { id: string; name: string }>> {
  if (productsCache) return productsCache;
  const products = await provider.products.getAll();
  const map = new Map<string, { id: string; name: string }>();
  for (const p of products) {
    map.set(p.id, { id: p.id, name: p.name });
  }
  productsCache = map;
  return map;
}

// =============================================================================
// READ OPERATIONS
// =============================================================================

/**
 * List all campaigns.
 */
export async function listCampaigns(signal?: AbortSignal): Promise<Campaign[]> {
  // Fetch products and campaigns in parallel — campaigns doesn't need products until mapping
  const productsPromise = fetchProducts();
  const campaignsPromise = (async () => {
    const allRecords: AirtableRecord[] = [];
    let offset: string | undefined;
    do {
      const url = offset ? `${CAMPAIGNS_TABLE}?offset=${offset}` : CAMPAIGNS_TABLE;
      const response = await airtableFetch(url, { signal });
      const data: AirtableResponse = await response.json();
      allRecords.push(...data.records);
      offset = data.offset;
    } while (offset && !signal?.aborted);
    return allRecords;
  })();

  const [productsMap, allRecords] = await Promise.all([productsPromise, campaignsPromise]);

  return allRecords
    .map((record) => mapAirtableToCampaign(record, productsMap))
    .filter((c): c is Campaign => c !== null);
}

/**
 * List campaigns filtered by product name.
 * Uses product name because linked record fields resolve to display names in formulas.
 */
export async function listCampaignsByProduct(productName: string): Promise<Campaign[]> {
  const productsMap = await fetchProducts();

  const filterFormula = encodeURIComponent(
    `{${FIELD_CAMPAIGN_PRODUCT}} = '${productName}'`
  );

  const allRecords: AirtableRecord[] = [];
  let offset: string | undefined;

  do {
    const url = offset
      ? `${CAMPAIGNS_TABLE}?filterByFormula=${filterFormula}&offset=${offset}`
      : `${CAMPAIGNS_TABLE}?filterByFormula=${filterFormula}`;
    const response = await airtableFetch(url);
    const data: AirtableResponse = await response.json();
    allRecords.push(...data.records);
    offset = data.offset;
  } while (offset);

  return allRecords
    .map((record) => mapAirtableToCampaign(record, productsMap))
    .filter((c): c is Campaign => c !== null);
}

/**
 * Get a single campaign by ID.
 */
export async function getCampaign(id: string): Promise<Campaign | null> {
  const productsMap = await fetchProducts();

  try {
    const response = await airtableFetch(`${CAMPAIGNS_TABLE}/${id}`);
    const record: AirtableRecord = await response.json();
    return mapAirtableToCampaign(record, productsMap);
  } catch (error) {
    if (error instanceof Error && error.message.includes('404')) {
      return null;
    }
    throw error;
  }
}

// =============================================================================
// REFERENCE DATA EXPORTS
// =============================================================================

/**
 * Get available products for dropdowns.
 */
export async function getProducts(): Promise<{ id: string; name: string }[]> {
  const map = await fetchProducts();
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Clear products cache (call when products may have changed).
 */
export function clearProductsCache(): void {
  productsCache = null;
}

// =============================================================================
// WRITE OPERATIONS
// =============================================================================

/**
 * Update a campaign's Redtrack Campaign ID and Name.
 */
export async function updateCampaignRedtrackId(
  campaignId: string,
  redtrackCampaignId: string,
  redtrackCampaignName?: string
): Promise<void> {
  const fields: Record<string, string> = {
    [FIELD_CAMPAIGN_REDTRACK_ID]: redtrackCampaignId,
  };

  if (redtrackCampaignName !== undefined) {
    fields[FIELD_CAMPAIGN_REDTRACK_NAME] = redtrackCampaignName;
  }

  await airtableFetch(`${CAMPAIGNS_TABLE}/${campaignId}`, {
    method: 'PATCH',
    body: JSON.stringify({ fields }),
  });
}

/**
 * Update a campaign's name.
 */
export async function updateCampaignName(
  campaignId: string,
  name: string
): Promise<void> {
  await airtableFetch(`${CAMPAIGNS_TABLE}/${campaignId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      fields: {
        [FIELD_CAMPAIGN_NAME]: name,
      },
    }),
  });
}

/**
 * Launch data to save to Airtable after successful Facebook launch.
 */
export interface UpdateLaunchDataParams {
  campaignId: string;
  fbCampaignId: string;
  fbAdAccountId: string;
  fbAdSetId?: string;
  fbAdIds?: string[];
  launchProfileId: string;
  snapshot?: LaunchSnapshot;
  imageIds?: string[];
}

/**
 * Update a campaign's launch data after successful Facebook launch.
 * Stores Facebook IDs, profile used, and full JSON snapshot.
 */
export async function updateLaunchData(params: UpdateLaunchDataParams): Promise<void> {
  const {
    campaignId,
    fbCampaignId,
    fbAdAccountId,
    launchProfileId,
    snapshot,
    imageIds,
  } = params;

  const fields: Record<string, unknown> = {
    [FIELD_FB_CAMPAIGN_ID]: fbCampaignId,
    [FIELD_FB_AD_ACCOUNT_ID]: fbAdAccountId,
    [FIELD_LAUNCH_PROFILE_ID]: launchProfileId,
    [FIELD_CAMPAIGN_STATUS]: 'Launched',
    [FIELD_LAUNCHED_AT]: new Date().toISOString(),
  };

  if (snapshot) {
    fields[FIELD_LAUNCHED_DATA] = JSON.stringify(snapshot);
  }

  if (imageIds && imageIds.length > 0) {
    fields[FIELD_IMAGES_USED] = imageIds;
  }

  await airtableFetch(`${CAMPAIGNS_TABLE}/${campaignId}`, {
    method: 'PATCH',
    body: JSON.stringify({ fields }),
  });
}

/**
 * Update campaign status in Airtable.
 */
export async function updateCampaignStatus(
  campaignId: string,
  status: CampaignStatus
): Promise<void> {
  await airtableFetch(`${CAMPAIGNS_TABLE}/${campaignId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      fields: {
        [FIELD_CAMPAIGN_STATUS]: status,
      },
    }),
  });
}

/**
 * Update a campaign's used media (videos and images).
 * Maps names to Airtable Record IDs.
 */
export async function updateCampaignMedia(
  campaignId: string,
  videoNames: string[],
  imageNames: string[]
): Promise<void> {
  const fields: Record<string, string | string[]> = {};

  if (videoNames.length > 0) {
    const allVideos = await listVideos();
    const videoIds = allVideos
      .filter(v => videoNames.includes(v.name))
      .map(v => v.id);

    if (videoIds.length > 0) {
      fields[FIELD_VIDEOS_USED] = videoIds;
    }
  }

  if (imageNames.length > 0) {
    const allImages = await listImages();
    const imageIds = allImages
      .filter(i => imageNames.includes(i.name))
      .map(i => i.id);

    if (imageIds.length > 0) {
      fields[FIELD_IMAGES_USED] = imageIds;
    }
  }

  if (Object.keys(fields).length === 0) {
    return;
  }

  await airtableFetch(`${CAMPAIGNS_TABLE}/${campaignId}`, {
    method: 'PATCH',
    body: JSON.stringify({ fields }),
  });
}

/**
 * Create a new campaign.
 * Returns the created campaign.
 */
export async function createCampaign(
  name: string,
  productId: string
): Promise<Campaign> {
  const productsMap = await fetchProducts();

  const response = await airtableFetch(CAMPAIGNS_TABLE, {
    method: 'POST',
    body: JSON.stringify({
      fields: {
        [FIELD_CAMPAIGN_NAME]: name,
        [FIELD_CAMPAIGN_PRODUCT]: [productId],
        [FIELD_CAMPAIGN_STATUS]: 'Preparing',
      },
    }),
  });

  const record: AirtableRecord = await response.json();
  const campaign = mapAirtableToCampaign(record, productsMap);

  if (!campaign) {
    throw new Error('Failed to create campaign');
  }

  return campaign;
}

// =============================================================================
// DRAFT OPERATIONS
// =============================================================================

/**
 * Parameters for saving a campaign draft.
 */
export interface SaveCampaignDraftParams {
  campaignId: string;
  name?: string;
  redtrackCampaignId?: string;
  redtrackCampaignName?: string;
  adPresetId?: string | null;
  adAccountId?: string | null;
  pageId?: string | null;
  pixelId?: string | null;
  startDate?: string;
  startTime?: string;
  budget?: string;
  geo?: string;
  ctaOverride?: string;
  websiteUrl?: string;
  utms?: string;
  displayLink?: string;
  linkVariable?: string;
  selectedProfileId?: string;
  reuseCreatives?: boolean;
  launchStatusActive?: boolean;
}

/**
 * Save campaign draft data to Airtable.
 * Only updates fields that are provided.
 */
export async function saveCampaignDraft(params: SaveCampaignDraftParams): Promise<void> {
  const { campaignId, ...draft } = params;

  const fields: Record<string, unknown> = {};

  if (draft.name !== undefined) fields[FIELD_CAMPAIGN_NAME] = draft.name;
  fields[FIELD_CAMPAIGN_PLATFORM] = 'Facebook';
  if (draft.redtrackCampaignId !== undefined) fields[FIELD_CAMPAIGN_REDTRACK_ID] = draft.redtrackCampaignId;
  if (draft.redtrackCampaignName !== undefined) fields[FIELD_CAMPAIGN_REDTRACK_NAME] = draft.redtrackCampaignName;
  if (draft.adPresetId !== undefined) fields[FIELD_SELECTED_AD_PROFILE] = draft.adPresetId ? [draft.adPresetId] : [];
  if (draft.adAccountId !== undefined) fields[FIELD_AD_ACC_USED] = draft.adAccountId || '';
  if (draft.pageId !== undefined) fields[FIELD_PAGE_USED] = draft.pageId || '';
  if (draft.pixelId !== undefined) fields[FIELD_PIXEL_USED] = draft.pixelId || '';
  if (draft.startDate !== undefined) fields[FIELD_LAUNCH_DATE] = draft.startDate || null;
  if (draft.startTime !== undefined) fields[FIELD_LAUNCH_TIME] = draft.startTime || '00:00';
  if (draft.budget !== undefined) fields[FIELD_CAMPAIGN_BUDGET] = draft.budget ? parseFloat(draft.budget) : null;
  if (draft.geo !== undefined) fields[FIELD_LOCATION_TARGETING] = draft.geo || '';
  if (draft.ctaOverride !== undefined) fields[FIELD_CTA] = draft.ctaOverride || '';
  if (draft.websiteUrl !== undefined) fields[FIELD_WEBSITE_URL] = draft.websiteUrl || '';
  if (draft.utms !== undefined) fields[FIELD_UTMS] = draft.utms || '';
  if (draft.displayLink !== undefined) fields[FIELD_DISPLAY_LINK] = draft.displayLink || '';
  if (draft.linkVariable !== undefined) fields[FIELD_LINK_VARIABLE] = draft.linkVariable || '';
  if (draft.selectedProfileId !== undefined) fields[FIELD_DRAFT_PROFILE] = draft.selectedProfileId || '';
  if (draft.reuseCreatives !== undefined) fields[FIELD_REUSE_CREATIVES] = draft.reuseCreatives;
  if (draft.launchStatusActive !== undefined) fields[FIELD_LAUNCH_AS_ACTIVE] = draft.launchStatusActive;

  if (Object.keys(fields).length === 0) return;

  await airtableFetch(`${CAMPAIGNS_TABLE}/${campaignId}`, {
    method: 'PATCH',
    body: JSON.stringify({ fields }),
  });
}

/**
 * Add image IDs to a campaign's "Images Used In This Campaign" field.
 * Reads existing IDs, merges with new ones, and updates.
 */
export async function addImageIdsToCampaign(
  campaignId: string,
  newImageIds: string[]
): Promise<void> {
  // 1. Fetch current campaign to get existing images
  // We fetch the raw record to get the current field value accurately
  const response = await airtableFetch(`${CAMPAIGNS_TABLE}/${campaignId}`);
  const record: AirtableRecord = await response.json();
  const existingIds = (record.fields[FIELD_IMAGES_USED] as string[]) || [];

  // 2. Merge unique
  const mergedIds = Array.from(new Set([...existingIds, ...newImageIds]));

  // 3. Update
  const fields = {
    [FIELD_IMAGES_USED]: mergedIds,
  };

  await airtableFetch(`${CAMPAIGNS_TABLE}/${campaignId}`, {
    method: 'PATCH',
    body: JSON.stringify({ fields }),
  });
}

// =============================================================================
// LIGHTWEIGHT LOOKUPS
// =============================================================================

/**
 * Fetch Launched campaigns and return a fbCampaignId → redtrackCampaignId map.
 * Used by the Manage page to match Facebook campaigns to Airtable campaigns.
 */
export async function getLaunchedCampaignRedtrackMap(): Promise<Map<string, string>> {
  const filterFormula = encodeURIComponent(`{${FIELD_CAMPAIGN_STATUS}} = 'Launched'`);
  const fieldsParam = 'fields[]=' + encodeURIComponent(FIELD_FB_CAMPAIGN_ID)
    + '&fields[]=' + encodeURIComponent(FIELD_CAMPAIGN_REDTRACK_ID);

  const allRecords: AirtableRecord[] = [];
  let offset: string | undefined;

  do {
    const base = `${CAMPAIGNS_TABLE}?filterByFormula=${filterFormula}&${fieldsParam}`;
    const url = offset ? `${base}&offset=${offset}` : base;
    const response = await airtableFetch(url);
    const data: AirtableResponse = await response.json();
    allRecords.push(...data.records);
    offset = data.offset;
  } while (offset);

  const map = new Map<string, string>();
  for (const record of allRecords) {
    const fbId = typeof record.fields[FIELD_FB_CAMPAIGN_ID] === 'string'
      ? record.fields[FIELD_FB_CAMPAIGN_ID]
      : '';
    const rtId = typeof record.fields[FIELD_CAMPAIGN_REDTRACK_ID] === 'string'
      ? record.fields[FIELD_CAMPAIGN_REDTRACK_ID]
      : '';
    if (fbId && rtId) {
      map.set(fbId, rtId);
    }
  }

  return map;
}

/**
 * Given an array of Facebook campaign IDs, look up matching Airtable Campaigns
 * records and extract the RedTrack campaign ID from the "Launched Data" JSON.
 *
 * Returns a Map of fbCampaignId → redtrackCampaignId.
 */
export async function getRedtrackIdsByFbCampaignIds(
  fbCampaignIds: string[],
): Promise<Map<string, string>> {
  if (fbCampaignIds.length === 0) return new Map();

  // Airtable OR() formula: match any of the FB Campaign IDs
  const conditions = fbCampaignIds.map(
    (id) => `{${FIELD_FB_CAMPAIGN_ID}} = '${id}'`,
  );
  const filterFormula = encodeURIComponent(
    conditions.length === 1 ? conditions[0] : `OR(${conditions.join(',')})`,
  );

  const fieldsParam =
    'fields[]=' + encodeURIComponent(FIELD_FB_CAMPAIGN_ID) +
    '&fields[]=' + encodeURIComponent(FIELD_LAUNCHED_DATA);

  const allRecords: AirtableRecord[] = [];
  let offset: string | undefined;

  do {
    const base = `${CAMPAIGNS_TABLE}?filterByFormula=${filterFormula}&${fieldsParam}`;
    const url = offset ? `${base}&offset=${offset}` : base;
    const response = await airtableFetch(url);
    const data: AirtableResponse = await response.json();
    allRecords.push(...data.records);
    offset = data.offset;
  } while (offset);

  const map = new Map<string, string>();

  for (const record of allRecords) {
    const fbId = typeof record.fields[FIELD_FB_CAMPAIGN_ID] === 'string'
      ? record.fields[FIELD_FB_CAMPAIGN_ID]
      : '';
    const launchedDataRaw = typeof record.fields[FIELD_LAUNCHED_DATA] === 'string'
      ? record.fields[FIELD_LAUNCHED_DATA]
      : '';

    if (!fbId || !launchedDataRaw) continue;

    try {
      const launchedData = JSON.parse(launchedDataRaw);
      const rtId = launchedData?.redtrack?.campaignId;
      if (typeof rtId === 'string' && rtId) {
        map.set(fbId, rtId);
      }
    } catch {
      // Skip records with invalid JSON
    }
  }

  return map;
}

// =============================================================================
// CAMPAIGN LAUNCH SETUP (per-product defaults)
// =============================================================================

const LAUNCH_SETUP_TABLE = 'Campaign Launch Setup';
const FIELD_SETUP_PRODUCT = 'Product';
const FIELD_SETUP_AMOUNT = 'Amount';
const FIELD_SETUP_AD_ACCOUNT = 'Ad Account';
const FIELD_SETUP_PIXEL = 'Pixel';
const FIELD_SETUP_PAGE = 'Page';
const FIELD_SETUP_CTA = 'Call to Action';
const FIELD_SETUP_TARGETING = 'Targeting';
const FIELD_SETUP_NAME = 'Name';
const FIELD_SETUP_COUNT = 'Count';

export interface CampaignLaunchSetup {
  id: string;
  adAccount: string | undefined;
  amount: string | undefined;
  pixel: string | undefined;
  page: string | undefined;
  callToAction: string | undefined;
  targeting: string | undefined;
}

/**
 * Fetch the first Campaign Launch Setup record for a given product ID.
 * Returns defaults (Amount, Pixel, Page) to pre-fill the launch form.
 */
export async function fetchLaunchSetup(productId: string): Promise<CampaignLaunchSetup | null> {
  // Fetch all records (table should be small) and filter client-side by record ID,
  // because Airtable's ARRAYJOIN on linked records returns display names, not record IDs.
  const allRecords: AirtableRecord[] = [];
  let offset: string | undefined;

  do {
    const url = offset
      ? `${LAUNCH_SETUP_TABLE}?offset=${offset}`
      : LAUNCH_SETUP_TABLE;
    const response = await airtableFetch(url);
    const data: AirtableResponse = await response.json();
    allRecords.push(...data.records);
    offset = data.offset;
  } while (offset);

  // Find first record whose Product linked field contains our productId
  const record = allRecords.find((r) => {
    const productIds = r.fields[FIELD_SETUP_PRODUCT];
    return Array.isArray(productIds) && productIds.includes(productId);
  });

  if (!record) return null;

  const fields = record.fields;

  return {
    id: record.id,
    adAccount: typeof fields[FIELD_SETUP_AD_ACCOUNT] === 'string'
      ? fields[FIELD_SETUP_AD_ACCOUNT]
      : undefined,
    amount: typeof fields[FIELD_SETUP_AMOUNT] === 'number'
      ? String(fields[FIELD_SETUP_AMOUNT])
      : typeof fields[FIELD_SETUP_AMOUNT] === 'string'
        ? fields[FIELD_SETUP_AMOUNT]
        : undefined,
    pixel: typeof fields[FIELD_SETUP_PIXEL] === 'string'
      ? fields[FIELD_SETUP_PIXEL]
      : undefined,
    page: typeof fields[FIELD_SETUP_PAGE] === 'string'
      ? fields[FIELD_SETUP_PAGE]
      : undefined,
    callToAction: typeof fields[FIELD_SETUP_CTA] === 'string'
      ? fields[FIELD_SETUP_CTA]
      : undefined,
    targeting: typeof fields[FIELD_SETUP_TARGETING] === 'string'
      ? fields[FIELD_SETUP_TARGETING]
      : undefined,
  };
}

export interface UpdateLaunchSetupPayload {
  pixel?: string;
  page?: string;
  adAccount?: string;
  amount?: string;
  callToAction?: string;
  targeting?: string;
}

/**
 * Update an existing Campaign Launch Setup record.
 */
export async function updateLaunchSetup(
  recordId: string,
  payload: UpdateLaunchSetupPayload
): Promise<void> {
  const fields: Record<string, unknown> = {};
  if (payload.pixel !== undefined) fields[FIELD_SETUP_PIXEL] = payload.pixel;
  if (payload.page !== undefined) fields[FIELD_SETUP_PAGE] = payload.page;
  if (payload.adAccount !== undefined) fields[FIELD_SETUP_AD_ACCOUNT] = payload.adAccount;
  if (payload.amount !== undefined) fields[FIELD_SETUP_AMOUNT] = payload.amount;
  if (payload.callToAction !== undefined) fields[FIELD_SETUP_CTA] = payload.callToAction;
  if (payload.targeting !== undefined) fields[FIELD_SETUP_TARGETING] = payload.targeting;

  await airtableFetch(`${LAUNCH_SETUP_TABLE}/${recordId}`, {
    method: 'PATCH',
    body: JSON.stringify({ fields }),
  });
}

/**
 * Create a new Campaign Launch Setup record for a product.
 */
export async function createLaunchSetup(
  productId: string,
  payload: UpdateLaunchSetupPayload
): Promise<CampaignLaunchSetup> {
  const fields: Record<string, unknown> = {
    [FIELD_SETUP_PRODUCT]: [productId],
  };
  if (payload.pixel) fields[FIELD_SETUP_PIXEL] = payload.pixel;
  if (payload.page) fields[FIELD_SETUP_PAGE] = payload.page;
  if (payload.adAccount) fields[FIELD_SETUP_AD_ACCOUNT] = payload.adAccount;
  if (payload.amount) fields[FIELD_SETUP_AMOUNT] = payload.amount;
  if (payload.callToAction) fields[FIELD_SETUP_CTA] = payload.callToAction;
  if (payload.targeting) fields[FIELD_SETUP_TARGETING] = payload.targeting;

  const response = await airtableFetch(LAUNCH_SETUP_TABLE, {
    method: 'POST',
    body: JSON.stringify({ fields }),
  });

  const record: AirtableRecord = await response.json();
  return {
    id: record.id,
    adAccount: typeof record.fields[FIELD_SETUP_AD_ACCOUNT] === 'string'
      ? record.fields[FIELD_SETUP_AD_ACCOUNT]
      : undefined,
    amount: typeof record.fields[FIELD_SETUP_AMOUNT] === 'number'
      ? String(record.fields[FIELD_SETUP_AMOUNT])
      : typeof record.fields[FIELD_SETUP_AMOUNT] === 'string'
        ? record.fields[FIELD_SETUP_AMOUNT]
        : undefined,
    pixel: typeof record.fields[FIELD_SETUP_PIXEL] === 'string'
      ? record.fields[FIELD_SETUP_PIXEL]
      : undefined,
    page: typeof record.fields[FIELD_SETUP_PAGE] === 'string'
      ? record.fields[FIELD_SETUP_PAGE]
      : undefined,
    callToAction: typeof record.fields[FIELD_SETUP_CTA] === 'string'
      ? record.fields[FIELD_SETUP_CTA]
      : undefined,
    targeting: typeof record.fields[FIELD_SETUP_TARGETING] === 'string'
      ? record.fields[FIELD_SETUP_TARGETING]
      : undefined,
  };
}

// =============================================================================
// SAVE LAUNCH TEMPLATE
// =============================================================================

export interface SaveLaunchTemplateParams {
  productId: string;
  adAccount?: string;
  pixel?: string;
  page?: string;
  amount?: string;
  callToAction?: string;
  targeting?: string;
}

/**
 * Save current launch page values as a new template in Campaign Launch Setup.
 * Standalone write — does not interact with the auto-load/save flow.
 */
export async function saveLaunchTemplate(params: SaveLaunchTemplateParams): Promise<void> {
  // 1. Count existing records for this product to generate name
  const allRecords: AirtableRecord[] = [];
  let offset: string | undefined;
  do {
    const url = offset
      ? `${LAUNCH_SETUP_TABLE}?offset=${offset}`
      : LAUNCH_SETUP_TABLE;
    const response = await airtableFetch(url);
    const data: AirtableResponse = await response.json();
    allRecords.push(...data.records);
    offset = data.offset;
  } while (offset);

  const productRecords = allRecords.filter((r) => {
    const productIds = r.fields[FIELD_SETUP_PRODUCT];
    return Array.isArray(productIds) && productIds.includes(params.productId);
  });

  const nextCount = productRecords.length + 1;

  // 2. Get product name for the record name
  const productsMap = await fetchProducts();
  const productName = productsMap.get(params.productId)?.name ?? 'Unknown';

  // 3. Create record
  const fields: Record<string, unknown> = {
    [FIELD_SETUP_PRODUCT]: [params.productId],
    [FIELD_SETUP_NAME]: `${productName} Default ${nextCount}`,
    [FIELD_SETUP_COUNT]: nextCount,
  };

  if (params.adAccount) fields[FIELD_SETUP_AD_ACCOUNT] = params.adAccount;
  if (params.pixel) fields[FIELD_SETUP_PIXEL] = params.pixel;
  if (params.page) fields[FIELD_SETUP_PAGE] = params.page;
  if (params.amount) fields[FIELD_SETUP_AMOUNT] = params.amount;
  if (params.callToAction) fields[FIELD_SETUP_CTA] = params.callToAction;
  if (params.targeting) fields[FIELD_SETUP_TARGETING] = params.targeting;

  await airtableFetch(LAUNCH_SETUP_TABLE, {
    method: 'POST',
    body: JSON.stringify({ fields }),
  });
}
