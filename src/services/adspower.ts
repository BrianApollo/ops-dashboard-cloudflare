/**
 * AdsPower Local API Service
 *
 * Calls the AdsPower local API directly from the browser.
 * AdsPower runs at http://local.adspower.net:50325 on the same machine.
 */

const BASE_URL = (import.meta as Record<string, unknown> & { env: Record<string, string> }).env.VITE_ADSPOWER_BASE_URL || 'http://local.adspower.net:50325';
const API_KEY = (import.meta as Record<string, unknown> & { env: Record<string, string> }).env.VITE_ADSPOWER_API_KEY || '59d4156935d84b37016b646b9f37b183006b3c8c127647f4';

// =============================================================================
// TYPES
// =============================================================================

export interface AdsPowerProfile {
  user_id: string;
  name: string;
  group_id: string;
  group_name: string;
  username: string;
  password?: string;
  user_2fa?: string;
  remark: string;
  created_time: number; // Unix timestamp
  user_proxy_config: {
    proxy_soft: string;
    proxy_type: string;
    proxy_host: string;
    proxy_port: string;
    proxy_user: string;
  };
}

// =============================================================================
// API CALLS
// =============================================================================

async function adsPowerFetch<T>(path: string): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`AdsPower API error: ${res.status}`);
  const data = await res.json() as { code: number; msg: string; data: T };
  if (data.code !== 0) throw new Error(`AdsPower error: ${data.msg}`);
  return data.data;
}

/**
 * List all AdsPower profiles.
 */
export async function listAdsPowerProfiles(
  page = 1,
  pageSize = 100,
): Promise<AdsPowerProfile[]> {
  const data = await adsPowerFetch<{ list: AdsPowerProfile[] }>(
    `/api/v1/user/list?page=${page}&page_size=${pageSize}&api_key=${API_KEY}`,
  );
  return data.list ?? [];
}

/**
 * Get the browser status for a specific AdsPower profile.
 */
export async function getAdsPowerBrowserStatus(
  userId: string,
): Promise<'Active' | 'Inactive'> {
  const data = await adsPowerFetch<{ status: string }>(
    `/api/v1/browser/active?user_id=${userId}&api_key=${API_KEY}`,
  );
  return data.status === 'Active' ? 'Active' : 'Inactive';
}

/**
 * Get full details for a single AdsPower profile.
 */
export async function getAdsPowerProfile(
  userId: string,
): Promise<AdsPowerProfile | null> {
  try {
    const data = await adsPowerFetch<{ list: AdsPowerProfile[] }>(
      `/api/v1/user/list?user_id=${userId}&api_key=${API_KEY}`,
    );
    return data.list?.[0] ?? null;
  } catch {
    return null;
  }
}
