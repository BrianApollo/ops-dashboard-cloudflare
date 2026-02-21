/**
 * D1 Query Functions — Profiles (Infrastructure)
 * READ-ONLY for Phase 3.
 *
 * Returns profiles with their linked BMs, pages, ad accounts, and pixels
 * assembled from JSON columns stored directly on each table.
 */

import { eq } from 'drizzle-orm';
import type { DbClient } from '../client';
import {
  profiles,
  businessManagers,
  adAccounts,
  pages,
  pixels,
} from '../schema';

/** Sensitive fields stripped for non-admin roles */
const SENSITIVE_FIELDS = [
  'permanentToken',
  'profileFbPassword',
  'profileEmailPassword',
  'profile2fa',
  'profileSecurityEmail',
  'securityEmailPassword',
] as const;

type ProfileRow = typeof profiles.$inferSelect;
type SanitizedProfile = Omit<ProfileRow, (typeof SENSITIVE_FIELDS)[number]>;

function sanitizeProfile(row: ProfileRow, isAdmin: boolean): SanitizedProfile | ProfileRow {
  if (isAdmin) return row;
  const safe = { ...row };
  for (const field of SENSITIVE_FIELDS) {
    delete (safe as Record<string, unknown>)[field];
  }
  return safe as SanitizedProfile;
}

/**
 * Fetch all infrastructure data in one call:
 * profiles → BMs → ad_accounts / pixels + pages
 */
export async function getInfrastructureData(db: DbClient, isAdmin: boolean) {
  // Fetch all tables in parallel (no junction tables needed)
  const [
    profileRows,
    bmRows,
    adAccountRows,
    pageRows,
    pixelRows,
  ] = await Promise.all([
    db.select().from(profiles).where(eq(profiles.hidden, false)),
    db.select().from(businessManagers).where(eq(businessManagers.hidden, false)),
    db.select().from(adAccounts).where(eq(adAccounts.hidden, false)),
    db.select().from(pages).where(eq(pages.hidden, false)),
    db.select().from(pixels).where(eq(pixels.hidden, false)),
  ]);

  // Strip sensitive fields from BMs for non-admin
  const sanitizedBms = bmRows.map((bm) => {
    if (isAdmin) return bm;
    const safe = { ...bm };
    delete (safe as Record<string, unknown>)['systemUserId'];
    delete (safe as Record<string, unknown>)['systemUserToken'];
    return safe;
  });

  // Index entity maps for O(1) lookup
  const adAccountById = new Map(adAccountRows.map((a) => [a.id, a]));
  const pageById = new Map(pageRows.map((p) => [p.id, p]));

  // Pixel linked IDs come from JSON columns on pixels
  const bmAdAccountIds = new Map(bmRows.map((bm) => [bm.id, JSON.parse(bm.adAccountIds ?? '[]') as string[]]));
  const bmPixelIds = new Map(bmRows.map((bm) => [bm.id, JSON.parse(bm.pixelIds ?? '[]') as string[]]));

  // Assemble pixels with owner BM ids
  const pixelsWithOwners = pixelRows.map((pixel) => ({
    ...pixel,
    ownerBmIds: JSON.parse(pixel.ownerBmIds ?? '[]') as string[],
  }));
  const pixelWithOwnerById = new Map(pixelsWithOwners.map((p) => [p.id, p]));

  // Assemble BMs with their ad accounts and pixels
  const bmsWithChildren = sanitizedBms.map((bm) => ({
    ...bm,
    adAccounts: (bmAdAccountIds.get(bm.id) ?? [])
      .map((id) => adAccountById.get(id))
      .filter(Boolean),
    pixels: (bmPixelIds.get(bm.id) ?? [])
      .map((id) => pixelWithOwnerById.get(id))
      .filter(Boolean),
  }));
  const bmWithChildrenById = new Map(bmsWithChildren.map((bm) => [bm.id, bm]));

  // Assemble profiles with their BMs and pages
  const profilesWithChildren = profileRows.map((profile) => {
    const bmIds = JSON.parse(profile.bmIds ?? '[]') as string[];
    const pageIds = JSON.parse(profile.pageIds ?? '[]') as string[];
    return {
      ...sanitizeProfile(profile, isAdmin),
      businessManagers: bmIds.map((id) => bmWithChildrenById.get(id)).filter(Boolean),
      pages: pageIds.map((id) => pageById.get(id)).filter(Boolean),
    };
  });

  return {
    profiles: profilesWithChildren,
    // Flat lists also returned for convenience
    allBusinessManagers: bmsWithChildren,
    allAdAccounts: adAccountRows,
    allPages: pageRows,
    allPixels: pixelsWithOwners,
  };
}

export async function getProfileById(db: DbClient, id: string, isAdmin: boolean) {
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, id));
  if (!profile) return null;
  return sanitizeProfile(profile, isAdmin);
}
