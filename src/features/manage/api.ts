/**
 * Facebook Graph API calls for the Manage page.
 *
 * Fetches ad accounts and campaigns using a profile's permanent token.
 */

import type { FbAdAccount, FbManageCampaign, FbAdReview, AdReviewResult, DatePreset } from './types';

// =============================================================================
// CONFIGURATION
// =============================================================================

const FB_API_VERSION = 'v21.0';
const FB_GRAPH_URL = 'https://graph.facebook.com';

// =============================================================================
// HELPERS
// =============================================================================

async function fbGet<T>(
  endpoint: string,
  accessToken: string,
  params?: Record<string, string>,
): Promise<T> {
  const url = new URL(`${FB_GRAPH_URL}/${FB_API_VERSION}/${endpoint}`);
  url.searchParams.set('access_token', accessToken);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  const response = await fetch(url.toString());
  const data = await response.json();

  if (data.error) {
    throw new Error(`Facebook API error: ${data.error.message}`);
  }

  return data as T;
}

async function fbPost<T>(
  endpoint: string,
  accessToken: string,
  body: Record<string, unknown>,
): Promise<T> {
  const url = new URL(`${FB_GRAPH_URL}/${FB_API_VERSION}/${endpoint}`);

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ access_token: accessToken, ...body }),
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(`Facebook API error: ${data.error.message}`);
  }

  return data as T;
}

// =============================================================================
// AD ACCOUNTS
// =============================================================================

/**
 * Fetch all ad accounts accessible by the given token.
 */
export async function fetchAdAccounts(accessToken: string): Promise<FbAdAccount[]> {
  interface Response {
    data: FbAdAccount[];
  }

  const result = await fbGet<Response>('me/adaccounts', accessToken, {
    fields: 'id,name,account_id,account_status,currency,business_name',
    limit: '100',
  });

  return result.data || [];
}

// =============================================================================
// CAMPAIGNS
// =============================================================================

/**
 * Fetch campaigns for a specific ad account with optional insights.
 */
export async function fetchCampaignsForAccount(
  adAccountId: string,
  accessToken: string,
  datePreset: DatePreset = 'last_7d',
): Promise<FbManageCampaign[]> {
  interface RawCampaign {
    id: string;
    name: string;
    status: 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED';
    daily_budget?: string;
    lifetime_budget?: string;
    objective: string;
    created_time: string;
    updated_time: string;
    insights?: {
      data?: Array<{
        spend?: string;
        purchase_roas?: Array<{ value: string }>;
        actions?: Array<{ action_type: string; value: string }>;
        action_values?: Array<{ action_type: string; value: string }>;
      }>;
    };
  }

  interface Response {
    data: RawCampaign[];
    paging?: { cursors?: { after?: string }; next?: string };
  }

  const allCampaigns: RawCampaign[] = [];
  let after: string | undefined;

  // Paginate through all campaigns
  do {
    const params: Record<string, string> = {
      fields: `id,name,status,daily_budget,lifetime_budget,objective,created_time,updated_time,insights.date_preset(${datePreset}){spend,purchase_roas,actions,action_values}`,
      limit: '100',
    };
    if (after) {
      params.after = after;
    }

    const result = await fbGet<Response>(
      `${adAccountId}/campaigns`,
      accessToken,
      params,
    );

    allCampaigns.push(...(result.data || []));
    after = result.paging?.cursors?.after;

    // Stop if no next page
    if (!result.paging?.next) break;
  } while (after);

  return allCampaigns as FbManageCampaign[];
}

/**
 * Fetch campaigns across all ad accounts.
 */
export async function fetchAllCampaigns(
  accessToken: string,
  datePreset: DatePreset = 'last_7d',
): Promise<{ campaigns: FbManageCampaign[]; adAccounts: FbAdAccount[] }> {
  const adAccounts = await fetchAdAccounts(accessToken);

  // Only fetch from active accounts (account_status 1 = ACTIVE)
  const activeAccounts = adAccounts.filter((a) => a.account_status === 1);

  const results = await Promise.allSettled(
    activeAccounts.map(async (account) => {
      const campaigns = await fetchCampaignsForAccount(
        account.id,
        accessToken,
        datePreset,
      );
      // Enrich each campaign with the ad account info
      return campaigns.map((c) => ({
        ...c,
        adAccountId: account.id,
        adAccountName: account.name || account.account_id,
      }));
    }),
  );

  const campaigns: FbManageCampaign[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      campaigns.push(...result.value);
    }
  }

  return { campaigns, adAccounts: activeAccounts };
}

// =============================================================================
// AD REVIEW CHECK
// =============================================================================

const FLAGGED_STATUSES = new Set([
  'DISAPPROVED',
  'PENDING_REVIEW',
  'WITH_ISSUES',
]);

/**
 * Fetch ads for a single campaign and return any that are rejected or in review.
 */
async function fetchFlaggedAdsForCampaign(
  campaignId: string,
  campaignName: string,
  adAccountId: string,
  accessToken: string,
): Promise<AdReviewResult | null> {
  interface Response {
    data: FbAdReview[];
  }

  const result = await fbGet<Response>(`${campaignId}/ads`, accessToken, {
    fields: 'id,name,effective_status,ad_review_feedback',
    limit: '500',
  });

  const flagged = (result.data || []).filter((ad) =>
    FLAGGED_STATUSES.has(ad.effective_status),
  );

  if (flagged.length === 0) return null;

  return { campaignId, campaignName, adAccountId, ads: flagged };
}

/**
 * Check all given campaigns for ads that are rejected or pending review.
 * Returns only campaigns that have flagged ads.
 */
export async function checkAdReview(
  campaigns: Array<{ id: string; name: string; adAccountId: string }>,
  accessToken: string,
  onProgress?: (checked: number, total: number) => void,
): Promise<AdReviewResult[]> {
  const results: AdReviewResult[] = [];
  const total = campaigns.length;

  // Process in batches of 5 to avoid rate limits
  const BATCH_SIZE = 5;
  for (let i = 0; i < campaigns.length; i += BATCH_SIZE) {
    const batch = campaigns.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.allSettled(
      batch.map((c) => fetchFlaggedAdsForCampaign(c.id, c.name, c.adAccountId, accessToken)),
    );

    for (const result of batchResults) {
      if (result.status === 'fulfilled' && result.value) {
        results.push(result.value);
      }
    }

    onProgress?.(Math.min(i + BATCH_SIZE, total), total);
  }

  return results;
}

// =============================================================================
// REQUEST REVIEW FOR REJECTED ADS
// =============================================================================

export interface ReviewRequestResult {
  adId: string;
  adName: string;
  success: boolean;
  error?: string;
}

/**
 * Request review for rejected ads.
 * POST /{ad_id} with { review_request: "true" }
 * This is the programmatic equivalent of clicking "Request review" in Ads Manager.
 * Changes effective_status from DISAPPROVED → IN_PROCESS.
 */
export async function requestAdReview(
  ads: Array<{ id: string; name: string }>,
  accessToken: string,
  onProgress?: (done: number, total: number) => void,
): Promise<ReviewRequestResult[]> {
  const results: ReviewRequestResult[] = [];
  const total = ads.length;

  // Process in batches of 3
  const BATCH_SIZE = 3;
  for (let i = 0; i < ads.length; i += BATCH_SIZE) {
    const batch = ads.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.allSettled(
      batch.map(async (ad) => {
        await fbPost<{ success: boolean }>(ad.id, accessToken, {
          review_request: 'true',
        });
        return ad;
      }),
    );

    for (let j = 0; j < batchResults.length; j++) {
      const result = batchResults[j];
      const ad = batch[j];
      if (result.status === 'fulfilled') {
        results.push({ adId: ad.id, adName: ad.name, success: true });
      } else {
        const errMsg = result.reason instanceof Error
          ? result.reason.message
          : 'Unknown error';
        results.push({ adId: ad.id, adName: ad.name, success: false, error: errMsg });
      }
    }

    onProgress?.(Math.min(i + BATCH_SIZE, total), total);
  }

  return results;
}

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Toggle campaign status between ACTIVE and PAUSED.
 */
export async function updateCampaignStatus(
  campaignId: string,
  status: 'ACTIVE' | 'PAUSED',
  accessToken: string,
): Promise<void> {
  await fbPost<{ success: boolean }>(campaignId, accessToken, { status });
}

/**
 * Update campaign daily budget (value in cents).
 */
export async function updateCampaignBudget(
  campaignId: string,
  dailyBudgetCents: number,
  accessToken: string,
): Promise<void> {
  await fbPost<{ success: boolean }>(campaignId, accessToken, {
    daily_budget: dailyBudgetCents,
  });
}
