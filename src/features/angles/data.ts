/**
 * Data abstraction layer for Angles.
 *
 * This file is the ONLY place that knows about Airtable for Angles.
 * All Airtable field names are mapped here — nowhere else.
 */

import type { Angle } from './types';
import { airtableFetch } from '../../core/data/airtable-client';
import { provider } from '../../data/provider';
import type { AirtableRecord, AirtableResponse } from '../../lib/airtable-types';

const ANGLES_TABLE = 'Angles';

const FIELD_NAME = 'Name';
const FIELD_PRODUCT = 'Product';
const FIELD_IS_ACTIVE = 'Is_Active';

let productsCache: Map<string, { id: string; name: string }> | null = null;

async function fetchProducts(): Promise<Map<string, { id: string; name: string }>> {
  if (productsCache) return productsCache;
  const products = await provider.products.getAll();
  const map = new Map<string, { id: string; name: string }>();
  for (const p of products) {
    map.set(p.id, { id: p.id, name: p.name });
  }
  productsCache = map;
  return map;
}

function mapAirtableToAngle(
  record: AirtableRecord,
  productsMap: Map<string, { id: string; name: string }>
): Angle | null {
  const fields = record.fields;

  const name = typeof fields[FIELD_NAME] === 'string' ? fields[FIELD_NAME] : null;
  if (!name) return null;

  const productIds = fields[FIELD_PRODUCT] as string[] | undefined;
  const productId = productIds?.[0];
  const product = productId && productsMap.has(productId)
    ? productsMap.get(productId)!
    : { id: 'unknown', name: 'Unknown Product' };

  const isActive = fields[FIELD_IS_ACTIVE] === true;

  return {
    id: record.id,
    name,
    product,
    isActive,
    createdAt: record.createdTime,
  };
}

export async function listAngles(signal?: AbortSignal): Promise<Angle[]> {
  const productsMap = await fetchProducts();
  const allRecords: AirtableRecord[] = [];
  let offset: string | undefined;
  do {
    const url = offset ? `${ANGLES_TABLE}?offset=${offset}` : ANGLES_TABLE;
    const res = await airtableFetch(url, { signal });
    const data: AirtableResponse = await res.json();
    allRecords.push(...data.records);
    offset = data.offset;
  } while (offset && !signal?.aborted);

  return allRecords
    .map((r) => mapAirtableToAngle(r, productsMap))
    .filter((a): a is Angle => a !== null);
}

export async function listAnglesByProduct(productName: string): Promise<Angle[]> {
  const productsMap = await fetchProducts();
  const filterFormula = encodeURIComponent(`{${FIELD_PRODUCT}} = '${productName}'`);

  const allRecords: AirtableRecord[] = [];
  let offset: string | undefined;
  do {
    const url = offset
      ? `${ANGLES_TABLE}?filterByFormula=${filterFormula}&offset=${offset}`
      : `${ANGLES_TABLE}?filterByFormula=${filterFormula}`;
    const res = await airtableFetch(url);
    const data: AirtableResponse = await res.json();
    allRecords.push(...data.records);
    offset = data.offset;
  } while (offset);

  return allRecords
    .map((r) => mapAirtableToAngle(r, productsMap))
    .filter((a): a is Angle => a !== null);
}

export async function createAngle(
  productId: string,
  name: string,
  isActive: boolean = true
): Promise<Angle> {
  const productsMap = await fetchProducts();

  const fields: Record<string, unknown> = {
    [FIELD_NAME]: name,
    [FIELD_PRODUCT]: [productId],
    [FIELD_IS_ACTIVE]: isActive,
  };

  const response = await airtableFetch(ANGLES_TABLE, {
    method: 'POST',
    body: JSON.stringify({ fields }),
  });

  const record: AirtableRecord = await response.json();
  const angle = mapAirtableToAngle(record, productsMap);
  if (!angle) throw new Error('Failed to create angle: invalid response from Airtable');
  return angle;
}

export async function updateAngleActive(angleId: string, isActive: boolean): Promise<Angle> {
  const productsMap = await fetchProducts();

  const response = await airtableFetch(`${ANGLES_TABLE}/${angleId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      fields: { [FIELD_IS_ACTIVE]: isActive },
    }),
  });

  const record: AirtableRecord = await response.json();
  const angle = mapAirtableToAngle(record, productsMap);
  if (!angle) throw new Error('Failed to update angle: invalid response from Airtable');
  return angle;
}

export async function deleteAngle(angleId: string): Promise<void> {
  await airtableFetch(`${ANGLES_TABLE}/${angleId}`, { method: 'DELETE' });
}

export function clearCaches(): void {
  productsCache = null;
}
