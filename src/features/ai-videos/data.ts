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
const FIELD_VIDEO_DATA = 'Video Data';

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
 * Mark AI Videos as Used WITHOUT touching their "Used In Campaign" links.
 *
 * The campaign link is owned by the Campaigns side of the relationship
 * (`addAIVideoIdsToCampaign`), which merges. Writing the link array from here
 * too would replace it, losing the campaigns the video was already used in.
 */
export async function markAIVideosUsed(ids: string[]): Promise<void> {
  if (ids.length === 0) return;

  const batchSize = 10;
  for (let i = 0; i < ids.length; i += batchSize) {
    const records = ids.slice(i, i + batchSize).map((id) => ({
      id,
      fields: { [FIELD_STATUS]: 'Used' },
    }));
    await airtableFetch(AI_VIDEOS_TABLE, {
      method: 'PATCH',
      body: JSON.stringify({ records }),
    });
  }
}

/**
 * Create a new AI Video record in Airtable.
 */
export async function createAIVideo(
  name: string,
  editorId: string,
  videoLink: string,
  productId: string,
  videoData?: string
): Promise<{ id: string; name: string }> {
  const fields: Record<string, unknown> = {
    [FIELD_VIDEO_NAME]: name,
    [FIELD_STATUS]: 'Available',
    [FIELD_EDITOR]: [editorId],
    [FIELD_CREATIVE_LINK]: videoLink,
    [FIELD_PRODUCT]: [productId],
  };

  if (videoData) {
    fields[FIELD_VIDEO_DATA] = videoData;
  }

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
