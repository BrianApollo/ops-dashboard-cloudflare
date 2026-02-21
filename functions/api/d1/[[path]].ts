/**
 * D1 API — /api/d1/[[path]]
 *
 * Unified read-only data endpoint backed by Cloudflare D1.
 * Mirrors the Airtable proxy in terms of auth and role enforcement,
 * but queries the local D1 database instead.
 *
 * Supported routes (GET only for Phase 3):
 *   /api/d1/products          → all products + assets
 *   /api/d1/products/:id      → single product + assets
 *   /api/d1/infrastructure    → full infra tree (profiles→BMs→accounts/pixels/pages)
 *   /api/d1/videos            → all videos
 *   /api/d1/videos/:id        → single video
 *   /api/d1/campaigns         → all campaigns + video/image ids
 *   /api/d1/campaigns/:id     → single campaign + video/image ids
 *   /api/d1/users             → all users (strip password_hash)
 *   /api/d1/users?role=X      → users filtered by role
 *   /api/d1/scripts           → all scripts with product + author names
 *   /api/d1/scripts/:id       → single script
 *   /api/d1/scripts?productId=X → scripts filtered by product
 *   /api/d1/images            → all images + temp images
 *   /api/d1/images?productId=X → images filtered by product
 *   /api/d1/ad-presets        → all ad presets with product name
 *   /api/d1/ad-presets/:id    → single ad preset
 *   /api/d1/ad-presets?productId=X → ad presets filtered by product
 *   /api/d1/advertorials      → all advertorials with product name
 *   /api/d1/advertorials?productId=X → advertorials filtered by product
 */

import { eq } from 'drizzle-orm';
import { authenticateRequest } from '../../lib/auth';
import { createDbClient } from '../../../src/db/client';
import { getAllProducts, getProductById } from '../../../src/db/queries/products';
import { getInfrastructureData } from '../../../src/db/queries/profiles';
import { getAllVideos, getVideoById } from '../../../src/db/queries/videos';
import { getAllCampaigns, getCampaignsByProduct, getCampaignById } from '../../../src/db/queries/campaigns';
import { getAllUsers } from '../../../src/db/queries/users';
import { getAllScripts, getScriptsByProduct, getScriptById } from '../../../src/db/queries/scripts';
import { getAllImages, getImagesByProduct } from '../../../src/db/queries/images';
import { getAllAdPresets, getAdPresetsByProduct, getAdPresetById } from '../../../src/db/queries/adPresets';
import { getAllAdvertorials, getAdvertorialsByProduct } from '../../../src/db/queries/advertorials';
import { getAllScalingRules } from '../../../src/db/queries/scalingRules';
import { profiles } from '../../../src/db/schema';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function notFound(msg = 'Not found'): Response {
  return json({ error: msg }, 404);
}

function unauthorized(): Response {
  return json({ error: 'Unauthorized' }, 401);
}

function forbidden(): Response {
  return json({ error: 'Forbidden' }, 403);
}

/** Updatable profile fields (D1 column name → Drizzle schema key) */
const PROFILE_PATCH_FIELDS = new Set([
  'adsPowerProfileId',
  'tokenValid',
  'permanentToken',
  'permanentTokenEndDate',
  'lastSync',
  'profileStatus',
] as const);

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;

  // Parse path segments first — needed to decide if PATCH is allowed
  const pathSegments = (params['path'] as string | string[] | undefined);
  const segments = Array.isArray(pathSegments)
    ? pathSegments
    : typeof pathSegments === 'string'
    ? pathSegments.split('/')
    : [];

  const [resource, id] = segments;

  // Allow PATCH only on infrastructure/profiles/:id; block everything else non-GET
  const isPatchAllowed = request.method === 'PATCH' && resource === 'infrastructure' && id === 'profiles' && !!segments[2];
  if (request.method !== 'GET' && !isPatchAllowed) {
    return json({ error: 'Method not allowed' }, 405);
  }

  // Authenticate
  const user = await authenticateRequest(request, env.JWT_SECRET);
  if (!user) return unauthorized();

  const role = user.role.toLowerCase();
  const isAdmin = role === 'admin';
  const isAdminOrOps = role === 'admin' || role === 'ops';

  const db = createDbClient(env.DB);

  // ─── PATCH /api/d1/infrastructure/profiles/:profileId ────────
  if (isPatchAllowed) {
    if (!isAdminOrOps) return forbidden();
    const profileId = segments[2];
    let body: Record<string, unknown>;
    try {
      body = await request.json() as Record<string, unknown>;
    } catch {
      return json({ error: 'Invalid JSON body' }, 400);
    }
    // Only allow known updatable fields
    const updates: Record<string, unknown> = {};
    for (const key of PROFILE_PATCH_FIELDS) {
      if (key in body) updates[key] = body[key];
    }
    if (Object.keys(updates).length === 0) {
      return json({ error: 'No updatable fields provided' }, 400);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.update(profiles).set(updates as any).where(eq(profiles.id, profileId));
    return json({ ok: true });
  }

  // ─── /api/d1/products ────────────────────────────────────────
  if (resource === 'products') {
    if (id) {
      const product = await getProductById(db, id);
      if (!product) return notFound();
      return json({ record: product });
    }
    const products = await getAllProducts(db);
    return json({ records: products });
  }

  // ─── /api/d1/infrastructure ──────────────────────────────────
  if (resource === 'infrastructure') {
    // Admin or Ops only
    if (!isAdminOrOps) return forbidden();
    const data = await getInfrastructureData(db, isAdmin);
    return json(data);
  }

  // ─── /api/d1/videos ──────────────────────────────────────────
  if (resource === 'videos') {
    if (id) {
      const video = await getVideoById(db, id);
      if (!video) return notFound();
      return json({ record: video });
    }
    const videos = await getAllVideos(db);
    return json({ records: videos });
  }

  // ─── /api/d1/campaigns ───────────────────────────────────────
  if (resource === 'campaigns') {
    if (id) {
      const campaign = await getCampaignById(db, id);
      if (!campaign) return notFound();
      return json({ record: campaign });
    }
    const url = new URL(request.url);
    const productId = url.searchParams.get('productId') ?? undefined;
    const campaigns = productId
      ? await getCampaignsByProduct(db, productId)
      : await getAllCampaigns(db);
    return json({ records: campaigns });
  }

  // ─── /api/d1/users ───────────────────────────────────────────
  if (resource === 'users') {
    const url = new URL(request.url);
    const role = url.searchParams.get('role') ?? undefined;
    const rows = await getAllUsers(db, role);
    // Strip password_hash — never send to client
    const safe = rows.map(({ passwordHash: _ph, ...rest }) => rest);
    return json({ records: safe });
  }

  // ─── /api/d1/scripts ─────────────────────────────────────────
  if (resource === 'scripts') {
    if (id) {
      const script = await getScriptById(db, id);
      if (!script) return notFound();
      return json({ record: script });
    }
    const url = new URL(request.url);
    const productId = url.searchParams.get('productId') ?? undefined;
    const scripts = productId
      ? await getScriptsByProduct(db, productId)
      : await getAllScripts(db);
    return json({ records: scripts });
  }

  // ─── /api/d1/images ──────────────────────────────────────────
  if (resource === 'images') {
    const url = new URL(request.url);
    const productId = url.searchParams.get('productId') ?? undefined;
    const data = productId
      ? await getImagesByProduct(db, productId)
      : await getAllImages(db);
    return json(data);
  }

  // ─── /api/d1/ad-presets ──────────────────────────────────────
  if (resource === 'ad-presets') {
    if (id) {
      const preset = await getAdPresetById(db, id);
      if (!preset) return notFound();
      return json({ record: preset });
    }
    const url = new URL(request.url);
    const productId = url.searchParams.get('productId') ?? undefined;
    const presets = productId
      ? await getAdPresetsByProduct(db, productId)
      : await getAllAdPresets(db);
    return json({ records: presets });
  }

  // ─── /api/d1/advertorials ────────────────────────────────────
  if (resource === 'advertorials') {
    const url = new URL(request.url);
    const productId = url.searchParams.get('productId') ?? undefined;
    const adverts = productId
      ? await getAdvertorialsByProduct(db, productId)
      : await getAllAdvertorials(db);
    return json({ records: adverts });
  }

  // ─── /api/d1/scaling-rules ───────────────────────────────────
  if (resource === 'scaling-rules') {
    const rules = await getAllScalingRules(db);
    return json({ records: rules });
  }

  return notFound('Unknown resource');
};
