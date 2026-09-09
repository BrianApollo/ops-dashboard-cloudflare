/**
 * mapTemplateCreative
 *
 * Maps a loaded FbCreative (from an existing ad's creative) into the
 * AdCreativeConfig + pageId that createAdsBatch expects.
 */

import type { FbCreative } from '../';
import type { AdCreativeConfig } from './fbLaunchApi';

export interface MappedTemplateCreative {
  pageId: string;
  adCreative: AdCreativeConfig;
}

/** Picks the first value that is present and not blank. Facebook returns '' as
 *  often as it omits a field, so `??` alone is not enough to fall through. */
function firstNonEmpty(...values: Array<string | undefined>): string {
  return values.find((v) => v != null && v.trim() !== '') ?? '';
}

export function mapTemplateCreative(
  creative: FbCreative,
  status: 'ACTIVE' | 'PAUSED' = 'PAUSED',
  fallbackWebsiteUrl?: string,
): MappedTemplateCreative {
  const storySpec = creative.object_story_spec;
  const pageId = storySpec?.page_id ?? '';

  // Video ads carry video_data; image ads carry link_data. Either can be the
  // template, so read whichever this creative actually has.
  const mediaData = storySpec?.video_data ?? storySpec?.link_data;

  return {
    pageId,
    adCreative: {
      websiteUrl: firstNonEmpty(
        mediaData?.call_to_action?.value?.link,
        storySpec?.link_data?.link,
        creative.asset_feed_spec?.link_urls?.[0]?.website_url,
        fallbackWebsiteUrl,
      ),
      callToAction: mediaData?.call_to_action?.type ?? 'SHOP_NOW',
      bodies: creative.asset_feed_spec?.bodies?.map((b) => b.text) ?? [],
      titles: creative.asset_feed_spec?.titles?.map((t) => t.text) ?? [],
      descriptions: creative.asset_feed_spec?.descriptions?.map((d) => d.text) ?? [],
      urlTags: creative.url_tags ?? '',
      advantagePlusCreative: !!creative.degrees_of_freedom_spec,
      status,
    },
  };
}
