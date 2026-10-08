/**
 * Cloudflare D1 data API — /api/db/[[path]]
 *
 * The Cloudflare-optimized dialect the frontend uses:
 *  - every list returns ALL matching rows in ONE response (no offset pages)
 *  - clean filter params: where[Field]=value, whereAny[Field]=a,b,
 *    whereNotEmpty[Field]=1 (same display-name semantics as linked records
 *    had in Airtable formulas)
 *  - batch writes up to 200 records per request
 *  - record shape unchanged: { id, fields, createdTime }
 *
 * /api/airtable/[[path]] remains as the Airtable-wire-compatible route used
 * by scripts/contract-test.mjs to verify parity against live Airtable.
 */

import { authenticateRequest } from '../../lib/auth';
import { canAccessTable, stripSensitiveFields } from '../../lib/permissions';
import { handleShimRequest, type DialectOptions } from '../../lib/db-api';
import type { D1Like } from '../../lib/db-api/schema';

interface Env {
  JWT_SECRET: string;
  DB: D1Like;
}

const DB_DIALECT: DialectOptions = { paginate: false, maxBatch: 200, whereParams: true };

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;

  const user = await authenticateRequest(request, env.JWT_SECRET);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const pathSegments = params.path as string[];
  const tableName = decodeURIComponent(pathSegments[0] || '');

  const access = canAccessTable(user, tableName, request.method);
  if (!access.allowed) {
    return new Response(
      JSON.stringify({ error: 'Forbidden', message: access.reason }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!env.DB) {
    return new Response(JSON.stringify({ error: 'No DB binding on this deployment' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(request.url);
  const response = await handleShimRequest(env.DB, request, pathSegments, url.searchParams, DB_DIALECT);

  const headers = { 'Content-Type': 'application/json', 'X-Data-Backend': 'd1' };
  if (request.method === 'GET' && response.ok) {
    try {
      const data = JSON.parse(await response.clone().text());
      if (data.records && Array.isArray(data.records)) {
        data.records = stripSensitiveFields(data.records, user);
        return new Response(JSON.stringify(data), { status: response.status, headers });
      }
    } catch {
      // Not a records list — pass through
    }
  }
  return new Response(response.body, { status: response.status, headers });
};
