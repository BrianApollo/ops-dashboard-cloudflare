/**
 * Data abstraction layer for AI Videos.
 *
 * Targets the "AI Videos" Airtable table.
 */

import { airtableFetch } from '../../core/data/airtable-client';
import type { AirtableRecord, AirtableResponse } from '../../lib/airtable-types';

// Table name
const AI_VIDEOS_TABLE = 'AI Videos';

// Airtable field mappings
const FIELD_VIDEO_NAME = 'Video Name';
const FIELD_STATUS = 'Status';
const FIELD_EDITOR = 'Editor';
const FIELD_CREATIVE_LINK = 'Creative Link';
const FIELD_PRODUCT = 'Product';
const FIELD_USED_IN_CAMPAIGN = 'Used In Campaign';

export interface AIVideo {
  id: string;
  name: string;
  status: string;
  creativeLink: string;
  productId: string;
}

/**
 * List AI Videos filtered by product name.
 * Uses product name (not ID) because linked record formulas return display names.
 */
export async function listAIVideosByProduct(productName: string): Promise<AIVideo[]> {
  const filterFormula = encodeURIComponent(
    `{${FIELD_PRODUCT}} = '${productName}'`,
  );

  const allRecords: AirtableRecord[] = [];
  let offset: string | undefined;
  do {
    const url = offset
      ? `${AI_VIDEOS_TABLE}?filterByFormula=${filterFormula}&offset=${offset}`
      : `${AI_VIDEOS_TABLE}?filterByFormula=${filterFormula}`;
    const res = await airtableFetch(url);
    const data: AirtableResponse = await res.json();
    allRecords.push(...data.records);
    offset = data.offset;
  } while (offset);

  return allRecords
    .map((r): AIVideo | null => {
      const name = typeof r.fields[FIELD_VIDEO_NAME] === 'string'
        ? r.fields[FIELD_VIDEO_NAME] : null;
      const creativeLink = typeof r.fields[FIELD_CREATIVE_LINK] === 'string'
        ? r.fields[FIELD_CREATIVE_LINK] : '';
      const status = typeof r.fields[FIELD_STATUS] === 'string'
        ? r.fields[FIELD_STATUS] : 'To Do';
      const productIds = Array.isArray(r.fields[FIELD_PRODUCT])
        ? r.fields[FIELD_PRODUCT] as string[] : [];
      if (!name) return null;
      return { id: r.id, name, status, creativeLink, productId: productIds[0] ?? '' };
    })
    .filter((v): v is AIVideo => v !== null);
}

/**
 * Update AI Videos to 'Used' status and link campaign.
 * For newly-used AI videos (first time being used in a campaign).
 */
export async function updateAIVideoUsage(ids: string[], campaignId: string): Promise<void> {
  const batchSize = 10;
  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    const records = batch.map((id) => ({
      id,
      fields: {
        [FIELD_STATUS]: 'Used',
        [FIELD_USED_IN_CAMPAIGN]: [campaignId],
      },
    }));
    await airtableFetch(AI_VIDEOS_TABLE, {
      method: 'PATCH',
      body: JSON.stringify({ records }),
    });
  }
}

/**
 * Append a campaign relation to AI Videos that are already 'Used'.
 * Reads existing campaign links first, then PATCHes with existing + new.
 */
export async function appendCampaignToAIVideos(ids: string[], campaignId: string): Promise<void> {
  const batchSize = 10;
  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    const currentRecords: Array<{ id: string; fields: Record<string, unknown> }> = [];
    for (const id of batch) {
      const res = await airtableFetch(`${AI_VIDEOS_TABLE}/${id}`);
      const rec = await res.json();
      if (rec.id) currentRecords.push(rec);
    }
    const records = currentRecords.map((rec) => {
      const existing = Array.isArray(rec.fields[FIELD_USED_IN_CAMPAIGN])
        ? (rec.fields[FIELD_USED_IN_CAMPAIGN] as string[])
        : [];
      const updated = existing.includes(campaignId) ? existing : [...existing, campaignId];
      return {
        id: rec.id,
        fields: { [FIELD_USED_IN_CAMPAIGN]: updated },
      };
    });
    if (records.length > 0) {
      await airtableFetch(AI_VIDEOS_TABLE, {
        method: 'PATCH',
        body: JSON.stringify({ records }),
      });
    }
  }
}

/**
 * Create a new AI Video record in Airtable.
 */
export async function createAIVideo(
  name: string,
  editorId: string,
  videoLink: string,
  productId: string
): Promise<{ id: string; name: string }> {
  const fields: Record<string, unknown> = {
    [FIELD_VIDEO_NAME]: name,
    [FIELD_STATUS]: 'To Do',
    [FIELD_EDITOR]: [editorId],
    [FIELD_CREATIVE_LINK]: videoLink,
    [FIELD_PRODUCT]: [productId],
  };

  const response = await airtableFetch(AI_VIDEOS_TABLE, {
    method: 'POST',
    body: JSON.stringify({ fields }),
  });

  const record: AirtableRecord = await response.json();

  const videoName = typeof record.fields[FIELD_VIDEO_NAME] === 'string'
    ? record.fields[FIELD_VIDEO_NAME]
    : name;

  return { id: record.id, name: videoName };
}
