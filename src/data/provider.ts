/**
 * Data Provider Abstraction
 *
 * Switches between Airtable and D1 based on VITE_DATA_PROVIDER env var.
 * Set VITE_DATA_PROVIDER=d1 to use D1, anything else (or unset) uses Airtable.
 *
 * This file lives in the browser bundle. It NEVER imports from src/db/ directly.
 * For D1, it calls the /api/d1/ Worker endpoint via fetch().
 */

import type { Product, ProductStatus } from '../features/products/types';
import type { Script, ScriptStatus } from '../features/scripts/types';
import type { VideoAsset, VideoStatus, VideoFormat } from '../features/videos/types';
import type { Campaign, CampaignStatus, CampaignPlatform } from '../features/campaigns/types';
import type { Image, ImageStatus, ImageType } from '../features/images/types';
import type { AdPreset } from '../features/ad-presets/types';
import type { Advertorial } from '../features/advertorials/types';
import { airtableFetch } from '../core/data/airtable-client';

// Shared user shape used by scripts + videos features
export interface UserRecord {
  id: string;
  name: string;
  role: string;
}

const DATA_PROVIDER = import.meta.env.VITE_DATA_PROVIDER ?? 'airtable';

// =============================================================================
// SHARED TYPES
// =============================================================================

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
  createdTime: string;
}

interface AirtableAttachment {
  id: string;
  url: string;
  filename: string;
}

interface D1AssetRow {
  id: string;
  url: string;
  filename: string;
  type: string;
}

// =============================================================================
// SHARED HELPERS
// =============================================================================

function normalizeProductStatus(raw: string | undefined): ProductStatus {
  if (!raw) return 'Active';
  const map: Record<string, ProductStatus> = {
    active: 'Active',
    live: 'Active',
    benched: 'Benched',
    paused: 'Benched',
    inactive: 'Benched',
    disabled: 'Benched',
    archived: 'Benched',
    preparing: 'Preparing',
  };
  return map[raw.toLowerCase()] ?? 'Active';
}

// =============================================================================
// AIRTABLE PRODUCT IMPLEMENTATION
// =============================================================================

function mapAirtableProduct(record: AirtableRecord): Product | null {
  const f = record.fields;
  const name = typeof f['Product Name'] === 'string' ? f['Product Name'] : null;
  if (!name) return null;

  const parseAtts = (val: unknown) => {
    if (!Array.isArray(val)) return [];
    return (val as unknown[])
      .filter(
        (a): a is AirtableAttachment =>
          !!a &&
          typeof a === 'object' &&
          'id' in a &&
          'url' in a &&
          'filename' in a,
      )
      .map((a) => ({ id: a.id, url: a.url, filename: a.filename }));
  };

  const driveLink = f['Drive Link'];
  let driveFolderId: string | undefined;
  if (typeof driveLink === 'string' && driveLink.trim()) {
    const m = driveLink.match(/folders\/([a-zA-Z0-9_-]+)/);
    driveFolderId = m ? m[1] : driveLink.trim();
  }

  return {
    id: record.id,
    name,
    status: normalizeProductStatus(
      typeof f['Status'] === 'string' ? f['Status'] : undefined,
    ),
    driveFolderId,
    images: parseAtts(f['Product Images']),
    logos: parseAtts(f['Product Logo']),
    createdAt: record.createdTime,
  };
}

const airtableProducts = {
  async getAll(): Promise<Product[]> {
    const TABLE = 'Products';
    const allRecords: AirtableRecord[] = [];
    let offset: string | undefined;
    do {
      const url = offset ? `${TABLE}?offset=${offset}` : TABLE;
      const res = await airtableFetch(url);
      const data: { records: AirtableRecord[]; offset?: string } =
        await res.json();
      allRecords.push(...data.records);
      offset = data.offset;
    } while (offset);
    return allRecords
      .map(mapAirtableProduct)
      .filter((p): p is Product => p !== null);
  },

  async getById(id: string): Promise<Product | null> {
    try {
      const res = await airtableFetch(`Products/${id}`);
      const record: AirtableRecord = await res.json();
      return mapAirtableProduct(record);
    } catch (e) {
      if (e instanceof Error && e.message.includes('404')) return null;
      throw e;
    }
  },
};

// =============================================================================
// D1 PRODUCT IMPLEMENTATION
// =============================================================================

function mapD1Product(row: Record<string, unknown>): Product | null {
  const name =
    typeof row['productName'] === 'string' ? row['productName'] : null;
  if (!name) return null;

  const assets = Array.isArray(row['assets'])
    ? (row['assets'] as D1AssetRow[])
    : [];

  return {
    id: String(row['id']),
    name,
    status: normalizeProductStatus(
      typeof row['status'] === 'string' ? row['status'] : undefined,
    ),
    driveFolderId:
      typeof row['driveFolderId'] === 'string' ? row['driveFolderId'] : undefined,
    images: assets
      .filter((a) => a.type === 'image')
      .map((a) => ({ id: a.id, url: a.url, filename: a.filename })),
    logos: assets
      .filter((a) => a.type === 'logo')
      .map((a) => ({ id: a.id, url: a.url, filename: a.filename })),
    createdAt:
      typeof row['createdAt'] === 'string'
        ? row['createdAt']
        : new Date().toISOString(),
  };
}

const d1Products = {
  async getAll(): Promise<Product[]> {
    const res = await fetch('/api/d1/products');
    if (!res.ok) throw new Error(`D1 products error: ${res.status}`);
    const data: { records: unknown[] } = await res.json();
    return data.records
      .map((r) => mapD1Product(r as Record<string, unknown>))
      .filter((p): p is Product => p !== null);
  },

  async getById(id: string): Promise<Product | null> {
    const res = await fetch(`/api/d1/products/${id}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`D1 product error: ${res.status}`);
    const data: { record: unknown } = await res.json();
    return mapD1Product(data.record as Record<string, unknown>);
  },
};

// =============================================================================
// AIRTABLE USERS IMPLEMENTATION
// =============================================================================

function mapAirtableUser(record: AirtableRecord): UserRecord {
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
    const res = await airtableFetch('Users');
    const data: { records: AirtableRecord[] } = await res.json();
    return data.records.map(mapAirtableUser);
  },
  async getEditors(): Promise<UserRecord[]> {
    const filter = encodeURIComponent(`({Role} = 'Video Editor')`);
    const res = await airtableFetch(`Users?filterByFormula=${filter}`);
    const data: { records: AirtableRecord[] } = await res.json();
    return data.records.map(mapAirtableUser);
  },
};

// =============================================================================
// D1 USERS IMPLEMENTATION
// =============================================================================

const d1Users = {
  async getAll(): Promise<UserRecord[]> {
    const res = await fetch('/api/d1/users');
    if (!res.ok) throw new Error(`D1 users error: ${res.status}`);
    const data: { records: UserRecord[] } = await res.json();
    return data.records;
  },
  async getEditors(): Promise<UserRecord[]> {
    const res = await fetch('/api/d1/users?role=Video+Editor');
    if (!res.ok) throw new Error(`D1 editors error: ${res.status}`);
    const data: { records: UserRecord[] } = await res.json();
    return data.records;
  },
};

// =============================================================================
// SCRIPTS IMPLEMENTATION
// =============================================================================

function mapD1Script(row: Record<string, unknown>): Script | null {
  const name = typeof row['scriptName'] === 'string' ? row['scriptName'] : null;
  if (!name) return null;

  const productId = typeof row['productId'] === 'string' ? row['productId'] : null;
  const authorId = typeof row['authorId'] === 'string' ? row['authorId'] : null;

  return {
    id: String(row['id']),
    name,
    status: 'draft' as ScriptStatus,
    product: {
      id: productId ?? 'unknown',
      name: typeof row['productName'] === 'string' ? row['productName'] : 'Unknown Product',
    },
    author: authorId
      ? {
          id: authorId,
          name: typeof row['authorName'] === 'string' ? row['authorName'] : 'Unknown',
          role: typeof row['authorRole'] === 'string' ? row['authorRole'] : '',
        }
      : undefined,
    content: typeof row['scriptContent'] === 'string' ? row['scriptContent'] : undefined,
    isApproved: row['isApproved'] === true || row['isApproved'] === 1,
    needsRevision: row['needsRevision'] === true || row['needsRevision'] === 1,
    version: typeof row['version'] === 'number' ? row['version'] : undefined,
    notes: typeof row['notes'] === 'string' ? row['notes'] : undefined,
    createdAt: typeof row['createdAt'] === 'string' ? row['createdAt'] : new Date().toISOString(),
    hook: typeof row['hook'] === 'string' ? row['hook'] : undefined,
    body: typeof row['body'] === 'string' ? row['body'] : undefined,
    hookNumber: typeof row['hookNumber'] === 'number' ? row['hookNumber'] : undefined,
    baseScriptNumber: typeof row['baseScriptNumber'] === 'number' ? row['baseScriptNumber'] : undefined,
  };
}

const d1Scripts = {
  async getAll(): Promise<Script[]> {
    const res = await fetch('/api/d1/scripts');
    if (!res.ok) throw new Error(`D1 scripts error: ${res.status}`);
    const data: { records: unknown[] } = await res.json();
    return data.records
      .map((r) => mapD1Script(r as Record<string, unknown>))
      .filter((s): s is Script => s !== null);
  },
  async getByProduct(productId: string): Promise<Script[]> {
    const res = await fetch(`/api/d1/scripts?productId=${encodeURIComponent(productId)}`);
    if (!res.ok) throw new Error(`D1 scripts error: ${res.status}`);
    const data: { records: unknown[] } = await res.json();
    return data.records
      .map((r) => mapD1Script(r as Record<string, unknown>))
      .filter((s): s is Script => s !== null);
  },
  async getById(id: string): Promise<Script | null> {
    const res = await fetch(`/api/d1/scripts/${id}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`D1 script error: ${res.status}`);
    const data: { record: unknown } = await res.json();
    return mapD1Script(data.record as Record<string, unknown>);
  },
};

// Airtable scripts delegates back to scripts/data.ts via re-export of listScripts —
// this stub is for the provider shape only (Airtable mode keeps data.ts original logic)
const airtableScripts = {
  async getAll(): Promise<Script[]> { return []; },
  async getByProduct(_productId: string): Promise<Script[]> { return []; },
  async getById(_id: string): Promise<Script | null> { return null; },
};

// =============================================================================
// VIDEOS IMPLEMENTATION
// =============================================================================

function normalizeVideoStatus(raw: string | null | undefined): VideoStatus {
  if (!raw) return 'todo';
  const map: Record<string, VideoStatus> = {
    'todo': 'todo', 'to do': 'todo',
    'review': 'review',
    'available': 'available',
    'used': 'used',
  };
  return map[raw.toLowerCase()] ?? 'todo';
}

function normalizeVideoFormat(raw: string | null | undefined): VideoFormat {
  if (!raw) return 'square';
  const lower = raw.toLowerCase();
  if (lower === 'vertical') return 'vertical';
  if (lower === 'youtube') return 'youtube';
  return 'square';
}

function extractDriveFileId(creativeLink: string | undefined): string | undefined {
  if (!creativeLink) return undefined;
  const driveMatch = creativeLink.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch) return driveMatch[1];
  try {
    const url = new URL(creativeLink);
    return url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname;
  } catch {
    return creativeLink;
  }
}

function mapD1Video(row: Record<string, unknown>): VideoAsset | null {
  const name = typeof row['videoName'] === 'string' ? row['videoName'] : null;
  if (!name) return null;

  const editorId = typeof row['editorId'] === 'string' ? row['editorId'] : null;
  const productId = typeof row['productId'] === 'string' ? row['productId'] : null;
  const scriptId = typeof row['scriptId'] === 'string' ? row['scriptId'] : null;
  const creativeLink = typeof row['creativeLink'] === 'string' ? row['creativeLink'] : undefined;

  return {
    id: String(row['id']),
    name,
    status: normalizeVideoStatus(typeof row['status'] === 'string' ? row['status'] : undefined),
    format: normalizeVideoFormat(typeof row['format'] === 'string' ? row['format'] : undefined),
    hasText: row['textVersion'] === 'Text',
    editor: {
      id: editorId ?? 'unknown',
      name: typeof row['editorName'] === 'string' ? row['editorName'] : 'Unknown Editor',
    },
    product: {
      id: productId ?? 'unknown',
      name: typeof row['productName'] === 'string' ? row['productName'] : 'Unknown Product',
      driveFolderId: typeof row['driveFolderId'] === 'string' ? row['driveFolderId'] : undefined,
    },
    script: {
      id: scriptId ?? 'unknown',
      name: typeof row['scriptName'] === 'string' ? row['scriptName'] : '',
    },
    createdAt: typeof row['createdAt'] === 'string' ? row['createdAt'] : new Date().toISOString(),
    thumbnail: '',
    creativeLink,
    driveFileId: extractDriveFileId(creativeLink),
    notes: typeof row['notes'] === 'string' ? row['notes'] : undefined,
    scrollstopperNumber: typeof row['scrollstopperNumber'] === 'number' ? row['scrollstopperNumber'] : undefined,
  };
}

const d1Videos = {
  async getAll(): Promise<VideoAsset[]> {
    const res = await fetch('/api/d1/videos');
    if (!res.ok) throw new Error(`D1 videos error: ${res.status}`);
    const data: { records: unknown[] } = await res.json();
    return data.records
      .map((r) => mapD1Video(r as Record<string, unknown>))
      .filter((v): v is VideoAsset => v !== null);
  },
  async getById(id: string): Promise<VideoAsset | null> {
    const res = await fetch(`/api/d1/videos/${id}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`D1 video error: ${res.status}`);
    const data: { record: unknown } = await res.json();
    return mapD1Video(data.record as Record<string, unknown>);
  },
};

// Airtable videos stub — Airtable mode keeps videos/data.ts original logic
const airtableVideos = {
  async getAll(): Promise<VideoAsset[]> { return []; },
  async getById(_id: string): Promise<VideoAsset | null> { return null; },
};

// =============================================================================
// CAMPAIGNS IMPLEMENTATION
// =============================================================================

function normalizeCampaignStatus(raw: string | null | undefined): CampaignStatus {
  if (!raw) return 'Preparing';
  const lower = raw.toLowerCase();
  if (lower === 'launched') return 'Launched';
  if (lower === 'cancelled') return 'Cancelled';
  return 'Preparing';
}

function normalizeCampaignPlatform(raw: string | null | undefined): CampaignPlatform | undefined {
  if (!raw) return undefined;
  const map: Record<string, CampaignPlatform> = {
    facebook: 'facebook', fb: 'facebook',
    instagram: 'instagram', ig: 'instagram',
    tiktok: 'tiktok', tt: 'tiktok',
    youtube: 'youtube', yt: 'youtube',
    google: 'google', 'google ads': 'google',
    other: 'other',
  };
  return map[raw.toLowerCase()] ?? 'other';
}

function mapD1Campaign(row: Record<string, unknown>): Campaign | null {
  const name = typeof row['campaignName'] === 'string' ? row['campaignName'] : null;
  if (!name) return null;
  const productId = typeof row['productId'] === 'string' ? row['productId'] : 'unknown';
  return {
    id: String(row['id']),
    name,
    status: normalizeCampaignStatus(typeof row['status'] === 'string' ? row['status'] : undefined),
    product: {
      id: productId,
      name: typeof row['productName'] === 'string' ? row['productName'] : 'Unknown Product',
    },
    platform: normalizeCampaignPlatform(typeof row['platform'] === 'string' ? row['platform'] : undefined),
    redTrackName: typeof row['redtrackCampaignName'] === 'string' ? row['redtrackCampaignName'] : undefined,
    redtrackCampaignId: typeof row['redtrackCampaignId'] === 'string' ? row['redtrackCampaignId'] : undefined,
    notes: typeof row['notes'] === 'string' ? row['notes'] : undefined,
    startDate: typeof row['startDate'] === 'string' ? row['startDate'] : undefined,
    endDate: typeof row['endDate'] === 'string' ? row['endDate'] : undefined,
    budget: typeof row['budget'] === 'number' ? row['budget'] : undefined,
    description: typeof row['description'] === 'string' ? row['description'] : undefined,
    fbCampaignId: typeof row['fbCampaignId'] === 'string' ? row['fbCampaignId'] : undefined,
    fbAdAccountId: typeof row['fbAdAccountId'] === 'string' ? row['fbAdAccountId'] : undefined,
    launchProfileId: typeof row['launchProfileId'] === 'string' ? row['launchProfileId'] : undefined,
    launchedData: typeof row['launchedData'] === 'string' ? row['launchedData'] : undefined,
    launchDate: typeof row['launchDate'] === 'string' ? row['launchDate'] : undefined,
    launchTime: typeof row['launchTime'] === 'string' ? row['launchTime'] : undefined,
    locationTargeting: typeof row['locationTargeting'] === 'string' ? row['locationTargeting'] : undefined,
    websiteUrl: typeof row['websiteUrl'] === 'string' ? row['websiteUrl'] : undefined,
    utms: typeof row['utms'] === 'string' ? row['utms'] : undefined,
    adAccUsed: typeof row['adAccUsed'] === 'string' ? row['adAccUsed'] : undefined,
    pageUsed: typeof row['pageUsed'] === 'string' ? row['pageUsed'] : undefined,
    pixelUsed: typeof row['pixelUsed'] === 'string' ? row['pixelUsed'] : undefined,
    selectedAdProfile: typeof row['selectedAdProfileId'] === 'string' ? row['selectedAdProfileId'] : undefined,
    cta: typeof row['cta'] === 'string' ? row['cta'] : undefined,
    displayLink: typeof row['displayLink'] === 'string' ? row['displayLink'] : undefined,
    linkVariable: typeof row['linkVariable'] === 'string' ? row['linkVariable'] : undefined,
    draftProfileId: typeof row['draftProfileId'] === 'string' ? row['draftProfileId'] : undefined,
    reuseCreatives: row['reuseCreatives'] === true || row['reuseCreatives'] === 1 ? true
      : row['reuseCreatives'] === false || row['reuseCreatives'] === 0 ? false : undefined,
    launchAsActive: row['launchAsActive'] === true || row['launchAsActive'] === 1 ? true
      : row['launchAsActive'] === false || row['launchAsActive'] === 0 ? false : undefined,
    createdAt: typeof row['createdAt'] === 'string' ? row['createdAt'] : new Date().toISOString(),
  };
}

const d1Campaigns = {
  async getAll(): Promise<Campaign[]> {
    const res = await fetch('/api/d1/campaigns');
    if (!res.ok) throw new Error(`D1 campaigns error: ${res.status}`);
    const data: { records: unknown[] } = await res.json();
    return data.records
      .map((r) => mapD1Campaign(r as Record<string, unknown>))
      .filter((c): c is Campaign => c !== null);
  },
  async getByProduct(productId: string): Promise<Campaign[]> {
    const res = await fetch(`/api/d1/campaigns?productId=${encodeURIComponent(productId)}`);
    if (!res.ok) throw new Error(`D1 campaigns error: ${res.status}`);
    const data: { records: unknown[] } = await res.json();
    return data.records
      .map((r) => mapD1Campaign(r as Record<string, unknown>))
      .filter((c): c is Campaign => c !== null);
  },
  async getById(id: string): Promise<Campaign | null> {
    const res = await fetch(`/api/d1/campaigns/${id}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`D1 campaign error: ${res.status}`);
    const data: { record: unknown } = await res.json();
    return mapD1Campaign(data.record as Record<string, unknown>);
  },
};

const airtableCampaigns = {
  async getAll(): Promise<Campaign[]> { return []; },
  async getByProduct(_productId: string): Promise<Campaign[]> { return []; },
  async getById(_id: string): Promise<Campaign | null> { return null; },
};

// =============================================================================
// IMAGES IMPLEMENTATION
// =============================================================================

function normalizeImageStatus(raw: string | null | undefined): ImageStatus {
  if (!raw) return 'pending';
  const map: Record<string, ImageStatus> = {
    pending: 'pending', available: 'available', ready: 'available',
    active: 'available', archived: 'archived', deleted: 'archived', new: 'new',
  };
  return map[raw.toLowerCase()] ?? 'pending';
}

function normalizeImageType(raw: string | null | undefined): ImageType | undefined {
  if (!raw) return undefined;
  const map: Record<string, ImageType> = {
    thumbnail: 'thumbnail', thumb: 'thumbnail',
    banner: 'banner', header: 'banner',
    square: 'square', '1:1': 'square',
    story: 'story', stories: 'story', '9:16': 'story',
    other: 'other',
  };
  return map[raw.toLowerCase()] ?? 'other';
}

function deriveThumbnailUrl(thumbnailUrl: string | undefined, driveLink: string | undefined): string | undefined {
  if (thumbnailUrl) return thumbnailUrl;
  if (!driveLink) return undefined;
  const match = driveLink.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w400`;
  return driveLink;
}

function mapD1Image(row: Record<string, unknown>): Image | null {
  const name = typeof row['imageName'] === 'string' ? row['imageName'] : null;
  if (!name) return null;
  const productId = typeof row['productId'] === 'string' ? row['productId'] : 'unknown';
  const driveLink = typeof row['imageDriveLink'] === 'string' ? row['imageDriveLink'] : undefined;
  const thumbnailRaw = typeof row['thumbnailUrl'] === 'string' ? row['thumbnailUrl'] : undefined;
  return {
    id: String(row['id']),
    name,
    status: normalizeImageStatus(typeof row['status'] === 'string' ? row['status'] : undefined),
    product: {
      id: productId,
      name: typeof row['productName'] === 'string' ? row['productName'] : 'Unknown Product',
    },
    imageType: normalizeImageType(typeof row['imageType'] === 'string' ? row['imageType'] : undefined),
    driveFileId: typeof row['driveFileId'] === 'string' ? row['driveFileId'] : undefined,
    thumbnailUrl: deriveThumbnailUrl(thumbnailRaw, driveLink),
    width: typeof row['width'] === 'number' ? row['width'] : undefined,
    height: typeof row['height'] === 'number' ? row['height'] : undefined,
    fileSize: typeof row['fileSize'] === 'number' ? row['fileSize'] : undefined,
    notes: typeof row['notes'] === 'string' ? row['notes'] : undefined,
    usedInCampaigns: [],
    createdAt: typeof row['createdAt'] === 'string' ? row['createdAt'] : new Date().toISOString(),
    image_drive_link: driveLink,
    count: typeof row['count'] === 'number' ? row['count'] : undefined,
  };
}

function mapD1TempImage(row: Record<string, unknown>): Image | null {
  const name = typeof row['imageName'] === 'string' ? row['imageName'] : null;
  if (!name) return null;
  const productId = typeof row['productId'] === 'string' ? row['productId'] : 'unknown';
  const driveLink = typeof row['driveLink'] === 'string' ? row['driveLink'] : undefined;
  return {
    id: String(row['id']),
    name,
    status: 'new' as ImageStatus,
    product: {
      id: productId,
      name: typeof row['productName'] === 'string' ? row['productName'] : 'Unknown Product',
    },
    imageType: 'other',
    driveFileId: undefined,
    thumbnailUrl: deriveThumbnailUrl(undefined, driveLink),
    usedInCampaigns: [],
    createdAt: typeof row['createdAt'] === 'string' ? row['createdAt'] : new Date().toISOString(),
    image_drive_link: driveLink,
    image_url: driveLink,
  };
}

const d1Images = {
  async getAll(): Promise<Image[]> {
    const res = await fetch('/api/d1/images');
    if (!res.ok) throw new Error(`D1 images error: ${res.status}`);
    const data: { images: unknown[]; tempImages: unknown[] } = await res.json();
    return [
      ...data.images.map((r) => mapD1Image(r as Record<string, unknown>)).filter((i): i is Image => i !== null),
      ...data.tempImages.map((r) => mapD1TempImage(r as Record<string, unknown>)).filter((i): i is Image => i !== null),
    ];
  },
  async getByProduct(productId: string): Promise<Image[]> {
    const res = await fetch(`/api/d1/images?productId=${encodeURIComponent(productId)}`);
    if (!res.ok) throw new Error(`D1 images error: ${res.status}`);
    const data: { images: unknown[]; tempImages: unknown[] } = await res.json();
    return [
      ...data.images.map((r) => mapD1Image(r as Record<string, unknown>)).filter((i): i is Image => i !== null),
      ...data.tempImages.map((r) => mapD1TempImage(r as Record<string, unknown>)).filter((i): i is Image => i !== null),
    ];
  },
};

const airtableImages = {
  async getAll(): Promise<Image[]> { return []; },
  async getByProduct(_productId: string): Promise<Image[]> { return []; },
};

// =============================================================================
// AD PRESETS IMPLEMENTATION
// =============================================================================

function mapD1AdPreset(row: Record<string, unknown>): AdPreset | null {
  const name = typeof row['presetName'] === 'string' ? row['presetName'] : null;
  if (!name) return null;
  const productId = typeof row['productId'] === 'string' ? row['productId'] : '';
  if (!productId) return null;  // Ad presets require a product
  const str = (key: string) => typeof row[key] === 'string' ? row[key] as string : undefined;
  return {
    id: String(row['id']),
    name,
    status: 'active' as const,
    product: {
      id: productId,
      name: typeof row['productName'] === 'string' ? row['productName'] : 'Unknown Product',
    },
    primaryText1: str('primaryText1'),
    primaryText2: str('primaryText2'),
    primaryText3: str('primaryText3'),
    primaryText4: str('primaryText4'),
    primaryText5: str('primaryText5'),
    headline1: str('headline1'),
    headline2: str('headline2'),
    headline3: str('headline3'),
    headline4: str('headline4'),
    headline5: str('headline5'),
    description1: str('description1'),
    description2: str('description2'),
    description3: str('description3'),
    description4: str('description4'),
    description5: str('description5'),
    callToAction: str('callToAction'),
    beneficiaryName: str('beneficiaryName'),
    payerName: str('payerName'),
    createdAt: str('createdAt') ?? new Date().toISOString(),
  };
}

const d1AdPresets = {
  async getAll(): Promise<AdPreset[]> {
    const res = await fetch('/api/d1/ad-presets');
    if (!res.ok) throw new Error(`D1 ad-presets error: ${res.status}`);
    const data: { records: unknown[] } = await res.json();
    return data.records
      .map((r) => mapD1AdPreset(r as Record<string, unknown>))
      .filter((p): p is AdPreset => p !== null);
  },
  async getByProduct(productId: string): Promise<AdPreset[]> {
    const res = await fetch(`/api/d1/ad-presets?productId=${encodeURIComponent(productId)}`);
    if (!res.ok) throw new Error(`D1 ad-presets error: ${res.status}`);
    const data: { records: unknown[] } = await res.json();
    return data.records
      .map((r) => mapD1AdPreset(r as Record<string, unknown>))
      .filter((p): p is AdPreset => p !== null);
  },
  async getById(id: string): Promise<AdPreset | null> {
    const res = await fetch(`/api/d1/ad-presets/${id}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`D1 ad-preset error: ${res.status}`);
    const data: { record: unknown } = await res.json();
    return mapD1AdPreset(data.record as Record<string, unknown>);
  },
};

const airtableAdPresets = {
  async getAll(): Promise<AdPreset[]> { return []; },
  async getByProduct(_productId: string): Promise<AdPreset[]> { return []; },
  async getById(_id: string): Promise<AdPreset | null> { return null; },
};

// =============================================================================
// ADVERTORIALS IMPLEMENTATION
// =============================================================================

function mapD1Advertorial(row: Record<string, unknown>): Advertorial | null {
  const name = typeof row['advertorialName'] === 'string' ? row['advertorialName'] : 'Unnamed Advertorial';
  const productId = typeof row['productId'] === 'string' ? row['productId'] : 'unknown';
  return {
    id: String(row['id']),
    name,
    productId,
    productName: typeof row['productName'] === 'string' ? row['productName'] : 'Unknown Product',
    text: typeof row['advertorialText'] === 'string' ? row['advertorialText'] : undefined,
    link: typeof row['finalLink'] === 'string' ? row['finalLink'] : undefined,
    isChecked: row['isChecked'] === true || row['isChecked'] === 1,
    createdAt: typeof row['createdAt'] === 'string' ? row['createdAt'] : new Date().toISOString(),
  };
}

const d1Advertorials = {
  async getAll(): Promise<Advertorial[]> {
    const res = await fetch('/api/d1/advertorials');
    if (!res.ok) throw new Error(`D1 advertorials error: ${res.status}`);
    const data: { records: unknown[] } = await res.json();
    return data.records
      .map((r) => mapD1Advertorial(r as Record<string, unknown>))
      .filter((a): a is Advertorial => a !== null);
  },
  async getByProduct(productId: string): Promise<Advertorial[]> {
    const res = await fetch(`/api/d1/advertorials?productId=${encodeURIComponent(productId)}`);
    if (!res.ok) throw new Error(`D1 advertorials error: ${res.status}`);
    const data: { records: unknown[] } = await res.json();
    return data.records
      .map((r) => mapD1Advertorial(r as Record<string, unknown>))
      .filter((a): a is Advertorial => a !== null);
  },
};

const airtableAdvertorials = {
  async getAll(): Promise<Advertorial[]> { return []; },
  async getByProduct(_productId: string): Promise<Advertorial[]> { return []; },
};

// =============================================================================
// EXPORTED PROVIDER
// =============================================================================

export const provider = {
  products: DATA_PROVIDER === 'd1' ? d1Products : airtableProducts,
  users: DATA_PROVIDER === 'd1' ? d1Users : airtableUsers,
  scripts: DATA_PROVIDER === 'd1' ? d1Scripts : airtableScripts,
  videos: DATA_PROVIDER === 'd1' ? d1Videos : airtableVideos,
  campaigns: DATA_PROVIDER === 'd1' ? d1Campaigns : airtableCampaigns,
  images: DATA_PROVIDER === 'd1' ? d1Images : airtableImages,
  adPresets: DATA_PROVIDER === 'd1' ? d1AdPresets : airtableAdPresets,
  advertorials: DATA_PROVIDER === 'd1' ? d1Advertorials : airtableAdvertorials,
};
