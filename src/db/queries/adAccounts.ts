/**
 * D1 Query Functions — Ad Accounts
 * READ-ONLY for Phase 3.
 */

import { eq } from 'drizzle-orm';
import type { DbClient } from '../client';
import { adAccounts } from '../schema';

export async function getAllAdAccounts(db: DbClient) {
  return db.select().from(adAccounts).where(eq(adAccounts.hidden, false));
}

export async function getAdAccountById(db: DbClient, id: string) {
  const [row] = await db
    .select()
    .from(adAccounts)
    .where(eq(adAccounts.id, id));
  return row ?? null;
}
