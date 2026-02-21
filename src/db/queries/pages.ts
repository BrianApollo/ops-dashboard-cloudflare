/**
 * D1 Query Functions — Pages
 * READ-ONLY for Phase 3.
 */

import { eq } from 'drizzle-orm';
import type { DbClient } from '../client';
import { pages } from '../schema';

export async function getAllPages(db: DbClient) {
  return db.select().from(pages).where(eq(pages.hidden, false));
}

export async function getPageById(db: DbClient, id: string) {
  const [row] = await db.select().from(pages).where(eq(pages.id, id));
  return row ?? null;
}
