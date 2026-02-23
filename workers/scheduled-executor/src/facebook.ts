/**
 * Facebook Graph API client for the cron worker.
 * Replicates the appsecret_proof computation from the Pages proxy.
 */

const FB_API_VERSION = 'v21.0';
const FB_GRAPH_URL = 'https://graph.facebook.com';

// =============================================================================
// APP SECRET PROOF
// =============================================================================

/**
 * Compute appsecret_proof — HMAC-SHA256 of the access token using the app secret.
 * Same logic as functions/api/facebook/proxy.ts.
 */
async function computeAppSecretProof(
  accessToken: string,
  appSecret: string,
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(appSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(accessToken));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// =============================================================================
// API CALLS
// =============================================================================

export interface FbApiResult {
  success: boolean;
  response: unknown;
}

/**
 * Update a Facebook campaign's daily budget.
 * Budget is in cents (worker converts dollars → cents before calling this).
 */
export async function updateCampaignBudget(
  campaignId: string,
  dailyBudgetCents: number,
  accessToken: string,
  appSecret: string,
): Promise<FbApiResult> {
  const proof = await computeAppSecretProof(accessToken, appSecret);
  const url = `${FB_GRAPH_URL}/${FB_API_VERSION}/${campaignId}`;

  const response = await fetch(url, {
    method: 'POST',
    body: new URLSearchParams({
      access_token: accessToken,
      appsecret_proof: proof,
      daily_budget: String(dailyBudgetCents),
    }),
  });

  const data = (await response.json()) as Record<string, unknown>;

  if (data.error) {
    return { success: false, response: data };
  }

  return { success: true, response: data };
}

/**
 * Update a Facebook campaign's status (ACTIVE / PAUSED).
 */
export async function updateCampaignStatus(
  campaignId: string,
  status: string,
  accessToken: string,
  appSecret: string,
): Promise<FbApiResult> {
  const proof = await computeAppSecretProof(accessToken, appSecret);
  const url = `${FB_GRAPH_URL}/${FB_API_VERSION}/${campaignId}`;

  const response = await fetch(url, {
    method: 'POST',
    body: new URLSearchParams({
      access_token: accessToken,
      appsecret_proof: proof,
      status,
    }),
  });

  const data = (await response.json()) as Record<string, unknown>;

  if (data.error) {
    return { success: false, response: data };
  }

  return { success: true, response: data };
}

// =============================================================================
// RULE EVALUATOR — READ OPERATIONS
// =============================================================================

export interface FbAdAccount {
  id: string;
  name: string;
  account_id: string;
  account_status: number;
}

export interface FbCampaign {
  id: string;
  name: string;
  status: string;
  daily_budget?: string;
  adAccountId: string;
}

export interface DailyInsight {
  campaign_id: string;
  campaign_name: string;
  date_start: string;
  purchase_roas: number;
  spend: number;
}

/**
 * Fetch all active ad accounts for the authenticated user.
 */
export async function fetchAdAccounts(
  accessToken: string,
  appSecret: string,
): Promise<FbAdAccount[]> {
  const proof = await computeAppSecretProof(accessToken, appSecret);
  const params = new URLSearchParams({
    access_token: accessToken,
    appsecret_proof: proof,
    fields: 'id,name,account_id,account_status',
    limit: '100',
  });

  const url = `${FB_GRAPH_URL}/${FB_API_VERSION}/me/adaccounts?${params}`;
  const response = await fetch(url);
  const data = (await response.json()) as {
    data?: FbAdAccount[];
    error?: { message: string };
  };

  if (data.error) {
    throw new Error(`FB ad accounts error: ${data.error.message}`);
  }

  return (data.data || []).filter((a) => a.account_status === 1);
}

/**
 * Fetch all ACTIVE campaigns for a specific ad account.
 */
export async function fetchActiveCampaigns(
  adAccountId: string,
  accessToken: string,
  appSecret: string,
): Promise<FbCampaign[]> {
  const proof = await computeAppSecretProof(accessToken, appSecret);
  const allCampaigns: FbCampaign[] = [];
  let after: string | undefined;

  do {
    const params = new URLSearchParams({
      access_token: accessToken,
      appsecret_proof: proof,
      fields: 'id,name,status,daily_budget',
      effective_status: '["ACTIVE"]',
      limit: '100',
    });
    if (after) params.set('after', after);

    const url = `${FB_GRAPH_URL}/${FB_API_VERSION}/${adAccountId}/campaigns?${params}`;
    const response = await fetch(url);
    const data = (await response.json()) as {
      data?: Array<{ id: string; name: string; status: string; daily_budget?: string }>;
      paging?: { cursors?: { after?: string }; next?: string };
      error?: { message: string };
    };

    if (data.error) {
      throw new Error(`FB campaigns error (${adAccountId}): ${data.error.message}`);
    }

    for (const c of data.data || []) {
      allCampaigns.push({ ...c, adAccountId });
    }

    after = data.paging?.cursors?.after;
    if (!data.paging?.next) break;
  } while (after);

  return allCampaigns;
}

/**
 * Fetch daily campaign insights (ROAS, spend) for an ad account.
 * Uses time_increment=1 to get per-day breakdowns.
 * One call per ad account gets data for ALL campaigns — efficient.
 */
export async function fetchCampaignInsightsDaily(
  adAccountId: string,
  since: string,
  until: string,
  accessToken: string,
  appSecret: string,
): Promise<DailyInsight[]> {
  const proof = await computeAppSecretProof(accessToken, appSecret);
  const allInsights: DailyInsight[] = [];
  let after: string | undefined;

  do {
    const params = new URLSearchParams({
      access_token: accessToken,
      appsecret_proof: proof,
      level: 'campaign',
      fields: 'campaign_id,campaign_name,purchase_roas,spend',
      time_range: JSON.stringify({ since, until }),
      time_increment: '1',
      limit: '500',
      filtering: JSON.stringify([
        { field: 'campaign.effective_status', operator: 'IN', value: ['ACTIVE'] },
      ]),
    });
    if (after) params.set('after', after);

    const url = `${FB_GRAPH_URL}/${FB_API_VERSION}/${adAccountId}/insights?${params}`;
    const response = await fetch(url);
    const data = (await response.json()) as {
      data?: Array<{
        campaign_id: string;
        campaign_name: string;
        date_start: string;
        purchase_roas?: Array<{ value: string }>;
        spend?: string;
      }>;
      paging?: { cursors?: { after?: string }; next?: string };
      error?: { message: string };
    };

    if (data.error) {
      throw new Error(`FB insights error (${adAccountId}): ${data.error.message}`);
    }

    for (const row of data.data || []) {
      allInsights.push({
        campaign_id: row.campaign_id,
        campaign_name: row.campaign_name,
        date_start: row.date_start,
        purchase_roas: row.purchase_roas?.[0]?.value
          ? parseFloat(row.purchase_roas[0].value)
          : 0,
        spend: row.spend ? parseFloat(row.spend) : 0,
      });
    }

    after = data.paging?.cursors?.after;
    if (!data.paging?.next) break;
  } while (after);

  return allInsights;
}
