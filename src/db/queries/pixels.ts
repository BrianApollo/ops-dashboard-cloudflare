/**
 * D1 Query Functions — Pixels
 * READ-ONLY for Phase 3.
 */

import { eq } from 'drizzle-orm';
import type { DbClient } from '../client';
import { pixels } from '../schema';

export async function getAllPixels(db: DbClient) {
  return db.select().from(pixels).where(eq(pixels.hidden, false));
}

export async function getPixelById(db: DbClient, id: string) {
  const [row] = await db.select().from(pixels).where(eq(pixels.id, id));
  return row ?? null;
}
