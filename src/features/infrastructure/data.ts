/**
 * Infrastructure Airtable CRUD
 *
 * Data layer for all 5 infrastructure tables.
 * Uses throttled fetch and maps Airtable fields to typed interfaces.
 */

import { airtableFetch } from '../../core/data/airtable-client';
import { TABLES, FIELDS } from './config';
import type {
  InfraProfile,
  InfraBM,
  InfraAdAccount,
  InfraPage,
  InfraPixel,
} from './types';
import type { AirtableRecord, AirtableResponse } from '../../lib/airtable-types';

const DATA_PROVIDER = import.meta.env.VITE_DATA_PROVIDER ?? 'airtable';

// =============================================================================
// HELPERS
// =============================================================================



function getLinkedIds(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string');
  return [];
}

function str(val: unknown): string {
  return typeof val === 'string' ? val : '';
}

function num(val: unknown): number {
  return typeof val === 'number' ? val : 0;
}

function bool(val: unknown): boolean {
  return val === true;
}

async function fetchAllRecords(tableId: string): Promise<AirtableRecord[]> {
  const all: AirtableRecord[] = [];
  let offset: string | undefined;

  do {
    const url = offset ? `${tableId}?offset=${offset}` : tableId;
    const response = await airtableFetch(url);
    const data: AirtableResponse = await response.json();
    all.push(...data.records);
    offset = data.offset;
  } while (offset);

  return all;
}

// =============================================================================
// MAPPERS
// =============================================================================

const FP = FIELDS.profiles;
const FB = FIELDS.bms;
const FA = FIELDS.adaccounts;
const FG = FIELDS.pages;
const FX = FIELDS.pixels;

function mapProfile(r: AirtableRecord): InfraProfile {
  const f = r.fields;
  return {
    id: r.id,
    profileId: str(f[FP.profileId]),
    profileName: str(f[FP.profileName]),
    profileStatus: str(f[FP.profileStatus]),
    permanentToken: str(f[FP.permanentToken]),
    permanentTokenEndDate: str(f[FP.permanentTokenEndDate]),
    tokenValid: bool(f[FP.tokenValid]),
    linkedBm: getLinkedIds(f[FP.linkedBm]),
    linkedPages: getLinkedIds(f[FP.linkedPages]),
    lastSync: str(f[FP.lastSync]),
    hidden: bool(f[FP.hidden]),
    profileEmail: str(f[FP.profileEmail]),
    profileFbPassword: str(f[FP.profileFbPassword]),
    profileEmailPassword: str(f[FP.profileEmailPassword]),
    profile2fa: str(f[FP.profile2fa]),
    profileBirthDate: str(f[FP.profileBirthDate]),
    profileLink: str(f[FP.profileLink]),
    profileReviewDate: str(f[FP.profileReviewDate]),
    profileSecurityEmail: str(f[FP.profileSecurityEmail]),
    securityEmailPassword: str(f[FP.securityEmailPassword]),
    proxy: str(f[FP.proxy]),
    profileYoutubeHandle: str(f[FP.profileYoutubeHandle]),
    profileGender: str(f[FP.profileGender]),
    profileLocation: str(f[FP.profileLocation]),
    profileYearCreated: str(f[FP.profileYearCreated]),
    uid: str(f[FP.uid]),
    adsPowerProfileId: str(f[FP.adsPowerProfileId]),
  };
}

function mapBM(r: AirtableRecord): InfraBM {
  const f = r.fields;
  return {
    id: r.id,
    bmId: str(f[FB.bmId]),
    bmName: str(f[FB.bmName]),
    bmStatus: str(f[FB.bmStatus]),
    verificationStatus: str(f[FB.verificationStatus]),
    linkedProfile: getLinkedIds(f[FB.linkedProfile]),
    linkedAdAccs: getLinkedIds(f[FB.linkedAdAccs]),
    linkedPixels: getLinkedIds(f[FB.linkedPixels]),
    ownedPixels: getLinkedIds(f[FB.ownedPixels]),
    systemUserId: str(f[FB.systemUserId]),
    systemUserToken: str(f[FB.systemUserToken]),
    systemUserCreated: str(f[FB.systemUserCreated]),
    lastSynced: str(f[FB.lastSynced]),
    hidden: bool(f[FB.hidden]),
  };
}

function mapAdAccount(r: AirtableRecord): InfraAdAccount {
  const f = r.fields;
  return {
    id: r.id,
    adAccId: str(f[FA.adAccId]),
    adAccName: str(f[FA.adAccName]),
    adAccStatus: str(f[FA.adAccStatus]),
    currency: str(f[FA.currency]),
    amountSpent: num(f[FA.amountSpent]),
    timezone: str(f[FA.timezone]),
    linkedBm: getLinkedIds(f[FA.linkedBm]),
    lastSynced: str(f[FA.lastSynced]),
    hidden: bool(f[FA.hidden]),
  };
}

function mapPage(r: AirtableRecord): InfraPage {
  const f = r.fields;
  return {
    id: r.id,
    pageId: str(f[FG.pageId]),
    pageName: str(f[FG.pageName]),
    published: str(f[FG.published]),
    pageLink: str(f[FG.pageLink]),
    fanCount: num(f[FG.fanCount]),
    linkedProfiles: getLinkedIds(f[FG.linkedProfiles]),
    lastSynced: str(f[FG.lastSynced]),
    hidden: bool(f[FG.hidden]),
  };
}

function mapPixel(r: AirtableRecord): InfraPixel {
  const f = r.fields;
  return {
    id: r.id,
    pixelId: str(f[FX.pixelId]),
    pixelName: str(f[FX.pixelName]),
    available: str(f[FX.available]),
    lastFiredTime: str(f[FX.lastFiredTime]),
    linkedBms: getLinkedIds(f[FX.linkedBms]),
    ownerBm: getLinkedIds(f[FX.ownerBm]),
    lastSynced: str(f[FX.lastSynced]),
    hidden: bool(f[FX.hidden]),
  };
}

// =============================================================================
// D1 INFRASTRUCTURE
// =============================================================================

interface D1InfraCache {
  profiles: InfraProfile[];
  bms: InfraBM[];
  adaccounts: InfraAdAccount[];
  pages: InfraPage[];
  pixels: InfraPixel[];
}

let d1InfraCache: D1InfraCache | null = null;

export function invalidateD1InfraCache() {
  d1InfraCache = null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapD1InfraData(data: any): D1InfraCache {
  // Build reverse maps while processing profiles
  const bmProfileMap = new Map<string, string[]>();
  const pageProfileMap = new Map<string, string[]>();

  const profiles: InfraProfile[] = (data.profiles ?? []).map((p: Record<string, unknown>) => {
    const bms = Array.isArray(p['businessManagers']) ? (p['businessManagers'] as Record<string, unknown>[]) : [];
    const pages = Array.isArray(p['pages']) ? (p['pages'] as Record<string, unknown>[]) : [];
    const bmIds = bms.map((bm) => String(bm['id']));
    const pageIds = pages.map((pg) => String(pg['id']));

    for (const bmId of bmIds) {
      const list = bmProfileMap.get(bmId) ?? [];
      list.push(String(p['id']));
      bmProfileMap.set(bmId, list);
    }
    for (const pageId of pageIds) {
      const list = pageProfileMap.get(pageId) ?? [];
      list.push(String(p['id']));
      pageProfileMap.set(pageId, list);
    }

    return {
      id: String(p['id']),
      profileId: str(p['profileFbId']),
      profileName: str(p['profileName']),
      profileStatus: str(p['profileStatus']),
      permanentToken: str(p['permanentToken']),
      permanentTokenEndDate: str(p['permanentTokenEndDate']),
      tokenValid: p['tokenValid'] === true || p['tokenValid'] === 1,
      linkedBm: bmIds,
      linkedPages: pageIds,
      lastSync: str(p['lastSync']),
      hidden: p['hidden'] === true || p['hidden'] === 1,
      profileEmail: str(p['profileEmail']),
      profileFbPassword: str(p['profileFbPassword']),
      profileEmailPassword: str(p['profileEmailPassword']),
      profile2fa: str(p['profile2fa']),
      profileBirthDate: str(p['profileBirthDate']),
      profileLink: str(p['profileLink']),
      profileReviewDate: str(p['profileReviewDate']),
      profileSecurityEmail: str(p['profileSecurityEmail']),
      securityEmailPassword: str(p['securityEmailPassword']),
      proxy: str(p['proxy']),
      profileYoutubeHandle: str(p['profileYoutubeHandle']),
      profileGender: str(p['profileGender']),
      profileLocation: str(p['profileLocation']),
      profileYearCreated: str(p['profileYearCreated']),
      uid: str(p['uid']),
      adsPowerProfileId: str(p['adsPowerProfileId']),
    };
  });

  const adAccBmMap = new Map<string, string[]>();
  const pixelBmMap = new Map<string, string[]>();

  const bms: InfraBM[] = (data.allBusinessManagers ?? []).map((bm: Record<string, unknown>) => {
    const adAccs = Array.isArray(bm['adAccounts']) ? (bm['adAccounts'] as Record<string, unknown>[]) : [];
    const pxls = Array.isArray(bm['pixels']) ? (bm['pixels'] as Record<string, unknown>[]) : [];
    const adAccIds = adAccs.map((a) => String(a['id']));
    const pixelIds = pxls.map((px) => String(px['id']));
    const ownedPixelIds = pxls
      .filter((px) => Array.isArray(px['ownerBmIds']) && (px['ownerBmIds'] as string[]).includes(String(bm['id'])))
      .map((px) => String(px['id']));

    for (const adAccId of adAccIds) {
      const list = adAccBmMap.get(adAccId) ?? [];
      list.push(String(bm['id']));
      adAccBmMap.set(adAccId, list);
    }
    for (const pixelId of pixelIds) {
      const list = pixelBmMap.get(pixelId) ?? [];
      list.push(String(bm['id']));
      pixelBmMap.set(pixelId, list);
    }

    return {
      id: String(bm['id']),
      bmId: str(bm['bmFbId']),
      bmName: str(bm['bmName']),
      bmStatus: str(bm['bmStatus']),
      verificationStatus: str(bm['verificationStatus']),
      linkedProfile: bmProfileMap.get(String(bm['id'])) ?? [],
      linkedAdAccs: adAccIds,
      linkedPixels: pixelIds,
      ownedPixels: ownedPixelIds,
      systemUserId: str(bm['systemUserId']),
      systemUserToken: str(bm['systemUserToken']),
      systemUserCreated: str(bm['systemUserCreated']),
      lastSynced: str(bm['lastSynced']),
      hidden: bm['hidden'] === true || bm['hidden'] === 1,
    };
  });

  const adaccounts: InfraAdAccount[] = (data.allAdAccounts ?? []).map((a: Record<string, unknown>) => ({
    id: String(a['id']),
    adAccId: str(a['adAccFbId']),
    adAccName: str(a['adAccName']),
    adAccStatus: str(a['adAccStatus']),
    currency: str(a['currency']),
    amountSpent: typeof a['amountSpent'] === 'number' ? a['amountSpent'] : 0,
    timezone: str(a['timezone']),
    linkedBm: adAccBmMap.get(String(a['id'])) ?? [],
    lastSynced: str(a['lastSynced']),
    hidden: a['hidden'] === true || a['hidden'] === 1,
  }));

  const pages: InfraPage[] = (data.allPages ?? []).map((p: Record<string, unknown>) => ({
    id: String(p['id']),
    pageId: str(p['pageFbId']),
    pageName: str(p['pageName']),
    published: str(p['published']),
    pageLink: str(p['pageLink']),
    fanCount: typeof p['fanCount'] === 'number' ? p['fanCount'] : 0,
    linkedProfiles: pageProfileMap.get(String(p['id'])) ?? [],
    lastSynced: str(p['lastSynced']),
    hidden: p['hidden'] === true || p['hidden'] === 1,
  }));

  const pixels: InfraPixel[] = (data.allPixels ?? []).map((px: Record<string, unknown>) => ({
    id: String(px['id']),
    pixelId: str(px['pixelFbId']),
    pixelName: str(px['pixelName']),
    available: str(px['available']),
    lastFiredTime: str(px['lastFiredTime']),
    linkedBms: pixelBmMap.get(String(px['id'])) ?? [],
    ownerBm: Array.isArray(px['ownerBmIds']) ? (px['ownerBmIds'] as string[]) : [],
    lastSynced: str(px['lastSynced']),
    hidden: px['hidden'] === true || px['hidden'] === 1,
  }));

  return { profiles, bms, adaccounts, pages, pixels };
}

async function fetchD1InfraData(): Promise<D1InfraCache> {
  if (d1InfraCache) return d1InfraCache;
  const res = await fetch('/api/d1/infrastructure');
  if (!res.ok) throw new Error(`D1 infrastructure error: ${res.status}`);
  const data = await res.json();
  d1InfraCache = mapD1InfraData(data);
  return d1InfraCache;
}

// =============================================================================
// LIST OPERATIONS
// =============================================================================

export async function listProfiles(): Promise<InfraProfile[]> {
  if (DATA_PROVIDER === 'd1') {
    const data = await fetchD1InfraData();
    return data.profiles;
  }
  const records = await fetchAllRecords(TABLES.profiles);
  return records.map(mapProfile);
}

export async function listBMs(): Promise<InfraBM[]> {
  if (DATA_PROVIDER === 'd1') {
    const data = await fetchD1InfraData();
    return data.bms;
  }
  const records = await fetchAllRecords(TABLES.bms);
  return records.map(mapBM);
}

export async function listAdAccounts(): Promise<InfraAdAccount[]> {
  if (DATA_PROVIDER === 'd1') {
    const data = await fetchD1InfraData();
    return data.adaccounts;
  }
  const records = await fetchAllRecords(TABLES.adaccounts);
  return records.map(mapAdAccount);
}

export async function listPages(): Promise<InfraPage[]> {
  if (DATA_PROVIDER === 'd1') {
    const data = await fetchD1InfraData();
    return data.pages;
  }
  const records = await fetchAllRecords(TABLES.pages);
  return records.map(mapPage);
}

export async function listPixels(): Promise<InfraPixel[]> {
  if (DATA_PROVIDER === 'd1') {
    const data = await fetchD1InfraData();
    return data.pixels;
  }
  const records = await fetchAllRecords(TABLES.pixels);
  return records.map(mapPixel);
}

// =============================================================================
// WRITE OPERATIONS
// =============================================================================

/**
 * Maps Airtable field names → D1/drizzle profile column names for the fields
 * that are both mutable from the UI and stored in the D1 profiles table.
 */
const AIRTABLE_TO_D1_PROFILE: Record<string, string> = {
  [FIELDS.profiles.adsPowerProfileId]: 'adsPowerProfileId',
  [FIELDS.profiles.tokenValid]:         'tokenValid',
  [FIELDS.profiles.permanentToken]:     'permanentToken',
  [FIELDS.profiles.permanentTokenEndDate]: 'permanentTokenEndDate',
  [FIELDS.profiles.lastSync]:           'lastSync',
  [FIELDS.profiles.profileStatus]:      'profileStatus',
};

async function syncProfileToD1(recordId: string, airtableFields: Record<string, unknown>): Promise<void> {
  const d1Fields: Record<string, unknown> = {};
  for (const [atField, value] of Object.entries(airtableFields)) {
    const d1Key = AIRTABLE_TO_D1_PROFILE[atField];
    if (d1Key) d1Fields[d1Key] = value;
  }
  if (Object.keys(d1Fields).length === 0) return;
  await fetch(`/api/d1/infrastructure/profiles/${recordId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(d1Fields),
    credentials: 'same-origin',
  });
}

export async function updateInfraRecord(
  table: keyof typeof TABLES,
  recordId: string,
  fields: Record<string, unknown>
): Promise<void> {
  await airtableFetch(`${TABLES[table]}/${recordId}`, {
    method: 'PATCH',
    body: JSON.stringify({ fields }),
  });
  // When using D1 as the read provider, also write the relevant fields to D1
  // so that refetchAll() returns the updated values immediately.
  if (DATA_PROVIDER === 'd1' && table === 'profiles') {
    await syncProfileToD1(recordId, fields);
  }
}

export async function createInfraRecord(
  table: keyof typeof TABLES,
  fields: Record<string, unknown>
): Promise<{ id: string }> {
  const response = await airtableFetch(TABLES[table], {
    method: 'POST',
    body: JSON.stringify({ fields }),
  });
  const data = await response.json();
  return { id: data.id };
}

export async function getInfraRecord(
  table: keyof typeof TABLES,
  recordId: string
): Promise<AirtableRecord> {
  const response = await airtableFetch(`${TABLES[table]}/${recordId}`);
  return response.json();
}
