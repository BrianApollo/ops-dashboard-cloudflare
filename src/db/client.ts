/**
 * D1 Client Factory
 *
 * Creates a Drizzle client bound to a Cloudflare D1 database.
 * This file is SERVER-SIDE ONLY — compiled by Wrangler, never by Vite.
 * Do NOT import this from src/ files that are included in the browser bundle.
 */

import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

// D1Database is a global type provided by the Cloudflare Workers runtime (via Wrangler).
// It is not available in the Vite/browser context.

export function createDbClient(d1: D1Database) {
  return drizzle(d1, { schema });
}

export type DbClient = ReturnType<typeof createDbClient>;
