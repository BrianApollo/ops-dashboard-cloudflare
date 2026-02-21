/**
 * D1 Query Functions — Videos
 * READ-ONLY for Phase 3.
 */

import { eq } from 'drizzle-orm';
import type { DbClient } from '../client';
import { videos, products, users, videoScripts } from '../schema';

const videoFields = {
  id:                  videos.id,
  videoName:           videos.videoName,
  status:              videos.status,
  format:              videos.format,
  textVersion:         videos.textVersion,
  productId:           videos.productId,
  editorId:            videos.editorId,
  scriptId:            videos.scriptId,
  creativeLink:        videos.creativeLink,
  notes:               videos.notes,
  scrollstopperNumber: videos.scrollstopperNumber,
  createdAt:           videos.createdAt,
  productName:         products.productName,
  driveFolderId:       products.driveFolderId,
  editorName:          users.name,
  scriptName:          videoScripts.scriptName,
};

export async function getAllVideos(db: DbClient) {
  return db
    .select(videoFields)
    .from(videos)
    .leftJoin(products, eq(videos.productId, products.id))
    .leftJoin(users, eq(videos.editorId, users.id))
    .leftJoin(videoScripts, eq(videos.scriptId, videoScripts.id));
}

export async function getVideosByProduct(db: DbClient, productId: string) {
  return db
    .select(videoFields)
    .from(videos)
    .leftJoin(products, eq(videos.productId, products.id))
    .leftJoin(users, eq(videos.editorId, users.id))
    .leftJoin(videoScripts, eq(videos.scriptId, videoScripts.id))
    .where(eq(videos.productId, productId));
}

export async function getVideosByEditor(db: DbClient, editorId: string) {
  return db
    .select(videoFields)
    .from(videos)
    .leftJoin(products, eq(videos.productId, products.id))
    .leftJoin(users, eq(videos.editorId, users.id))
    .leftJoin(videoScripts, eq(videos.scriptId, videoScripts.id))
    .where(eq(videos.editorId, editorId));
}

export async function getVideoById(db: DbClient, id: string) {
  const [row] = await db
    .select(videoFields)
    .from(videos)
    .leftJoin(products, eq(videos.productId, products.id))
    .leftJoin(users, eq(videos.editorId, users.id))
    .leftJoin(videoScripts, eq(videos.scriptId, videoScripts.id))
    .where(eq(videos.id, id));
  return row ?? null;
}
