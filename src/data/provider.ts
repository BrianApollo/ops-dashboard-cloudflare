/**
 * Data Provider
 *
 * Airtable-only implementation. D1 support has been removed.
 */

import type { Product, ProductStatus } from '../features/products/types';
import type { Script } from '../features/scripts/types';
import type { VideoAsset } from '../features/videos/types';
import type { Campaign } from '../features/campaigns/types';
import type { Image } from '../features/images/types';
import type { AdPreset } from '../features/ad-presets/types';
import type { Advertorial } from '../features/advertorials/types';
import { dbFetch } from '../core/data/db-client';
import { fetchAllRecords } from '../lib/db-helpers';

// Shared user shape used by scripts + videos features
export interface UserRecord {
  id: string;
  name: string;
  role: string;
}

// =============================================================================
// SHARED TYPES
// =============================================================================

interface DbRecord {
  id: string;
  fields: Record<string, unknown>;
  createdTime: string;
}

// =============================================================================
// SHARED LOOKUP CACHE
// =============================================================================
// Products and Users are fetched by 6+ data modules as lookup tables.
// This cache ensures each table is only fetched once per session.
// Cache expires after 30 seconds to stay in sync with TanStack Query staleTime.

const CACHE_TTL = 30 * 1000; // 30 seconds

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  promise?: Promise<T>;
}

const lookupCache: {
  products?: CacheEntry<Product[]>;
  users?: CacheEntry<UserRecord[]>;
  editors?: CacheEntry<UserRecord[]>;
} = {};

function getCached<T>(entry: CacheEntry<T> | undefined): T | null {
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) return null;
  return entry.data;
}

// =============================================================================
// SHARED HELPERS
// =============================================================================

function normalizeProductStatus(raw: string | undefined): ProductStatus {
  if (!raw) return 'Active';
  const map: Record<string, ProductStatus> = {
    active: 'Active',
    inactive: 'Inactive',
    'in development': 'In Development',
    development: 'In Development',
    discontinued: 'Discontinued',
  };
  return map[raw.toLowerCase()] ?? 'Active';
}

// =============================================================================
// PRODUCTS IMPLEMENTATION (AIRTABLE)
// =============================================================================

function mapAirtableProduct(record: DbRecord): Product | null {
  const fields = record.fields;
  const name = typeof fields['Product Name'] === 'string' ? fields['Product Name'] : null;
  if (!name) return null;

  const attachments = Array.isArray(fields['Product Image'])
    ? (fields['Product Image'] as Array<{ url: string }>)
    : [];
  const imageUrl = attachments[0]?.url;

  const rawStatus = Array.isArray(fields['Status'])
    ? (fields['Status'] as string[])[0]
    : typeof fields['Status'] === 'string'
    ? fields['Status']
    : undefined;

  const driveFolderId =
    typeof fields['Drive Folder ID'] === 'string' ? fields['Drive Folder ID'] : undefined;

  return {
    id: record.id,
    name,
    status: normalizeProductStatus(rawStatus),
    imageUrl,
    driveFolderId,
    createdAt: record.createdTime,
  };
}

const airtableProducts = {
  async getAll(): Promise<Product[]> {
    // Return cached if fresh
    const cached = getCached(lookupCache.products);
    if (cached) return cached;

    // Deduplicate concurrent calls — if a fetch is in-flight, reuse it
    if (lookupCache.products?.promise) return lookupCache.products.promise;

    const promise = (async () => {
      const TABLE = 'Products';
      const allRecords = await fetchAllRecords(TABLE);
      const products = allRecords
        .map(mapAirtableProduct)
        .filter((p): p is Product => p !== null);
      lookupCache.products = { data: products, timestamp: Date.now() };
      return products;
    })();

    // Store promise for deduplication
    lookupCache.products = { data: [], timestamp: 0, promise };
    return promise;
  },

  async getById(id: string): Promise<Product | null> {
    try {
      const res = await dbFetch(`Products/${id}`);
      const record: DbRecord = await res.json();
      return mapAirtableProduct(record);
    } catch (e) {
      if (e instanceof Error && e.message.includes('404')) return null;
      throw e;
    }
  },
};

// =============================================================================
// USERS IMPLEMENTATION (AIRTABLE)
// =============================================================================

function mapAirtableUser(record: DbRecord): UserRecord {
  const role = Array.isArray(record.fields['Role'])
    ? ((record.fields['Role'] as string[])[0] ?? '')
    : typeof record.fields['Role'] === 'string'
    ? record.fields['Role']
    : '';
  return {
    id: record.id,
    name: typeof record.fields['Name'] === 'string' ? record.fields['Name'] : 'Unknown',
    role: role.trim(),
  };
}

const airtableUsers = {
  async getAll(): Promise<UserRecord[]> {
    const cached = getCached(lookupCache.users);
    if (cached) return cached;
    if (lookupCache.users?.promise) return lookupCache.users.promise;

    const promise = (async () => {
      const res = await dbFetch('Users');
      const data: { records: DbRecord[] } = await res.json();
      const users = data.records.map(mapAirtableUser);
      lookupCache.users = { data: users, timestamp: Date.now() };
      return users;
    })();

    lookupCache.users = { data: [], timestamp: 0, promise };
    return promise;
  },
  async getEditors(): Promise<UserRecord[]> {
    // Try to derive from cached users (editors are a subset)
    const allUsers = getCached(lookupCache.users);
    if (allUsers) return allUsers.filter(u => u.role === 'Video Editor');

    const cached = getCached(lookupCache.editors);
    if (cached) return cached;
    if (lookupCache.editors?.promise) return lookupCache.editors.promise;

    const promise = (async () => {
      const res = await dbFetch(`Users?where%5BRole%5D=${encodeURIComponent('Video Editor')}`);
      const data: { records: DbRecord[] } = await res.json();
      const editors = data.records.map(mapAirtableUser);
      lookupCache.editors = { data: editors, timestamp: Date.now() };
      return editors;
    })();

    lookupCache.editors = { data: [], timestamp: 0, promise };
    return promise;
  },
};

// =============================================================================
// EXPORTED PROVIDER
// =============================================================================

export const provider = {
  products: airtableProducts,
  users: airtableUsers,
  // The following are referenced under DATA_PROVIDER === 'd1' guards in feature
  // data.ts files. They are never called in airtable mode but must exist for
  // TypeScript compilation.
  scripts: {
    async getAll(): Promise<Script[]> { return []; },
    async getByProduct(_productId: string): Promise<Script[]> { return []; },
    async getById(_id: string): Promise<Script | null> { return null; },
  },
  videos: {
    async getAll(): Promise<VideoAsset[]> { return []; },
    async getById(_id: string): Promise<VideoAsset | null> { return null; },
  },
  campaigns: {
    async getAll(): Promise<Campaign[]> { return []; },
    async getByProduct(_productId: string): Promise<Campaign[]> { return []; },
    async getById(_id: string): Promise<Campaign | null> { return null; },
  },
  images: {
    async getAll(): Promise<Image[]> { return []; },
    async getByProduct(_productId: string): Promise<Image[]> { return []; },
  },
  adPresets: {
    async getAll(): Promise<AdPreset[]> { return []; },
    async getByProduct(_productId: string): Promise<AdPreset[]> { return []; },
    async getById(_id: string): Promise<AdPreset | null> { return null; },
  },
  advertorials: {
    async getAll(): Promise<Advertorial[]> { return []; },
    async getByProduct(_productId: string): Promise<Advertorial[]> { return []; },
  },
};
