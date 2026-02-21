/**
 * D1 Query Functions — Business Managers
 * READ-ONLY for Phase 3.
 */

import { eq } from 'drizzle-orm';
import type { DbClient } from '../client';
import { businessManagers } from '../schema';

const SENSITIVE_FIELDS = ['systemUserId', 'systemUserToken'] as const;

function sanitizeBm(
  row: typeof businessManagers.$inferSelect,
  isAdmin: boolean,
) {
  if (isAdmin) return row;
  const safe = { ...row };
  for (const field of SENSITIVE_FIELDS) {
    delete (safe as Record<string, unknown>)[field];
  }
  return safe;
}

export async function getAllBusinessManagers(db: DbClient, isAdmin: boolean) {
  const rows = await db
    .select()
    .from(businessManagers)
    .where(eq(businessManagers.hidden, false));
  return rows.map((row) => sanitizeBm(row, isAdmin));
}

export async function getBusinessManagerById(
  db: DbClient,
  id: string,
  isAdmin: boolean,
) {
  const [row] = await db
    .select()
    .from(businessManagers)
    .where(eq(businessManagers.id, id));
  if (!row) return null;
  return sanitizeBm(row, isAdmin);
}
