/**
 * Data abstraction layer for AI Videos.
 *
 * Targets the "AI Videos" Airtable table.
 * Only create operations for now.
 */

import { airtableFetch } from '../../core/data/airtable-client';
import type { AirtableRecord } from '../../lib/airtable-types';

// Table name
const AI_VIDEOS_TABLE = 'AI Videos';

// Airtable field mappings
const FIELD_VIDEO_NAME = 'Video Name';
const FIELD_STATUS = 'Status';
const FIELD_EDITOR = 'Editor';
const FIELD_CREATIVE_LINK = 'Creative Link';
const FIELD_PRODUCT = 'Product';

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
