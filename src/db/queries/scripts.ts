/**
 * D1 Query Functions — Video Scripts
 * READ-ONLY for Phase 3.
 */

import { eq } from 'drizzle-orm';
import type { DbClient } from '../client';
import { videoScripts, products, users } from '../schema';

const scriptFields = {
  id:               videoScripts.id,
  scriptName:       videoScripts.scriptName,
  productId:        videoScripts.productId,
  authorId:         videoScripts.authorId,
  scriptContent:    videoScripts.scriptContent,
  isApproved:       videoScripts.isApproved,
  needsRevision:    videoScripts.needsRevision,
  version:          videoScripts.version,
  notes:            videoScripts.notes,
  hook:             videoScripts.hook,
  body:             videoScripts.body,
  hookNumber:       videoScripts.hookNumber,
  baseScriptNumber: videoScripts.baseScriptNumber,
  createdAt:        videoScripts.createdAt,
  productName:      products.productName,
  authorName:       users.name,
  authorRole:       users.role,
};

export async function getAllScripts(db: DbClient) {
  return db
    .select(scriptFields)
    .from(videoScripts)
    .leftJoin(products, eq(videoScripts.productId, products.id))
    .leftJoin(users, eq(videoScripts.authorId, users.id));
}

export async function getScriptsByProduct(db: DbClient, productId: string) {
  return db
    .select(scriptFields)
    .from(videoScripts)
    .leftJoin(products, eq(videoScripts.productId, products.id))
    .leftJoin(users, eq(videoScripts.authorId, users.id))
    .where(eq(videoScripts.productId, productId));
}

export async function getScriptById(db: DbClient, id: string) {
  const [row] = await db
    .select(scriptFields)
    .from(videoScripts)
    .leftJoin(products, eq(videoScripts.productId, products.id))
    .leftJoin(users, eq(videoScripts.authorId, users.id))
    .where(eq(videoScripts.id, id));
  return row ?? null;
}
