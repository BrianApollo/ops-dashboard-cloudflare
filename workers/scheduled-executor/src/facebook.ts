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

  const data = await response.json();

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

  const data = await response.json();

  if (data.error) {
    return { success: false, response: data };
  }

  return { success: true, response: data };
}
