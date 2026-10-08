/**
 * Centralized data-API client.
 *
 * ALL data calls route through the server-side Cloudflare D1 API at /api/db/.
 * The server authenticates via JWT and reads/writes the D1 database directly —
 * no third-party API, no rate limits, no request throttling needed.
 *
 * Record shape is unchanged from the Airtable era: { id, fields, createdTime }.
 */

// =============================================================================
// AUTH TOKEN
// =============================================================================

let authToken: string | null = null;

/**
 * Set the JWT auth token. Called after login.
 * The token is sent with every request.
 */
export function setAuthToken(token: string | null): void {
  authToken = token;
}

/**
 * Get the current auth token.
 */
export function getAuthToken(): string | null {
  return authToken;
}

// =============================================================================
// DATA FETCH (via /api/db server endpoint)
// =============================================================================

/**
 * Centralized data fetch wrapper. Routes through the /api/db/ D1 endpoint.
 *
 * @param endpoint - Table name or path (e.g., 'Users', 'Products/rec123')
 * @param options - RequestInit options
 * @returns Response from the server
 */
export async function dbFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Attach JWT for authentication
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(`/api/db/${endpoint}`, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  if (!response.ok) {
    // Handle auth errors
    if (response.status === 401) {
      // Token expired or invalid — clear it
      authToken = null;
      throw new Error('Session expired. Please log in again.');
    }
    if (response.status === 403) {
      const data = await response.json().catch(() => ({})) as { message?: string };
      throw new Error(data.message || 'Access denied');
    }

    let errorMessage = `Data API error: ${response.status} ${response.statusText}`;
    try {
      const errorData = await response.json() as { error?: { type?: string; message?: string } };
      if (errorData.error) {
        const errType = errorData.error.type || 'UNKNOWN_ERROR';
        const errMsg = errorData.error.message || '';
        errorMessage = `Data API error (${errType}): ${errMsg}`;
      }
    } catch { /* use default */ }
    throw new Error(errorMessage);
  }

  return response;
}
