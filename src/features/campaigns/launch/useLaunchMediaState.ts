/**
 * useLaunchMediaState
 *
 * Derives available media for campaign launch:
 * - baseVideos (for prelaunch uploader)
 * - availableVideos (merged with library/upload state)
 * - availableImages
 * - allVideos / allImages (same records, ignoring the usage filter)
 *
 * Pure derivation only - no effects, no writes.
 *
 * Extracted from useCampaignLaunchController (Phase 7.2 Step 6A).
 */

import { useMemo } from 'react';
import type { useVideosController } from '../../videos/useVideosController';
import type { useImagesController } from '../../images';
import type { usePrelaunchUploaderEffect } from './usePrelaunchUploaderEffect';
import type { SelectableVideo, SelectableImage, MediaUsageFilter } from './types';

// Base video type for prelaunch uploader
export interface BaseVideo {
  id: string;
  name: string;
  creativeLink: string;
}

export interface UseLaunchMediaStateOptions {
  productId: string | undefined;
  videosController: ReturnType<typeof useVideosController>;
  imagesController: ReturnType<typeof useImagesController>;
  prelaunchUploader: ReturnType<typeof usePrelaunchUploaderEffect>;
  /** Omit to keep the legacy (unfiltered) behaviour used by Add Ads. */
  usageFilter?: MediaUsageFilter;
}

export interface UseLaunchMediaStateReturn {
  baseVideos: BaseVideo[];
  availableVideos: SelectableVideo[];
  availableImages: SelectableImage[];
  /** Same records as above but ignoring `usageFilter` - used to resolve selections. */
  allVideos: SelectableVideo[];
  allImages: SelectableImage[];
}

// =============================================================================
// USAGE PREDICATES (shared with useCampaignLaunchOrchestrator)
// =============================================================================

/**
 * A video is "used" once a launch has flipped its Airtable status to Used.
 * Everything still launchable sits in Available/Review.
 */
export function videoMatchesUsage(status: string, usageFilter?: MediaUsageFilter): boolean {
  if (usageFilter === 'used') return status === 'used';
  return ['available', 'review'].includes(status);
}

/** AI Videos keep the raw Airtable status string. */
export function aiVideoMatchesUsage(status: string, usageFilter?: MediaUsageFilter): boolean {
  if (usageFilter === 'used') return status === 'Used';
  return status !== 'Used';
}

/** Images have no "used" status - usage is the Used In Campaigns link. */
export function imageMatchesUsage(
  image: { status: string; usedInCampaigns: string[] },
  usageFilter?: MediaUsageFilter
): boolean {
  if (image.status === 'new') return false;
  if (usageFilter === 'used') return image.usedInCampaigns.length > 0;
  if (usageFilter === 'not-used') return image.usedInCampaigns.length === 0;
  // Legacy behaviour (Add Ads): available images plus anything never used.
  return image.status === 'available' || image.usedInCampaigns.length === 0;
}

export function useLaunchMediaState({
  productId,
  videosController,
  imagesController,
  prelaunchUploader,
  usageFilter,
}: UseLaunchMediaStateOptions): UseLaunchMediaStateReturn {
  const { libraryMap, uploadStates } = prelaunchUploader;

  // ---------------------------------------------------------------------------
  // BASE VIDEOS (without library/upload state - needed for prelaunch uploader)
  // ---------------------------------------------------------------------------
  const baseVideos = useMemo((): BaseVideo[] => {
    if (!productId) return [];
    return videosController.list.allRecords
      .filter((v) => v.product.id === productId && videoMatchesUsage(v.status, usageFilter) && v.format.toLowerCase() !== 'youtube')
      .map((v) => ({
        id: v.id,
        name: v.name,
        creativeLink: v.creativeLink || '',
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [videosController.list.allRecords, productId, usageFilter]);

  // ---------------------------------------------------------------------------
  // ALL VIDEOS (product-scoped, usage filter NOT applied)
  // ---------------------------------------------------------------------------
  const allVideos = useMemo((): SelectableVideo[] => {
    if (!productId) return [];
    return videosController.list.allRecords
      .filter((v) => v.product.id === productId && v.format.toLowerCase() !== 'youtube')
      .map((v) => {
        const libraryEntry = libraryMap.get(v.name);
        const uploadState = uploadStates.get(v.name);
        return {
          id: v.id,
          name: v.name,
          status: v.status,
          format: v.format,
          creativeLink: v.creativeLink,
          productId: v.product.id,
          inLibrary: !!libraryEntry,
          fbVideoId: libraryEntry?.fbVideoId || uploadState?.fbVideoId,
          fbThumbnailUrl: libraryEntry?.thumbnailUrl || uploadState?.thumbnailUrl,
          uploadStatus: uploadState?.status,
          uploadError: uploadState?.error,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [videosController.list.allRecords, productId, libraryMap, uploadStates]);

  // ---------------------------------------------------------------------------
  // AVAILABLE VIDEOS (visible list - usage filter applied)
  // ---------------------------------------------------------------------------
  const availableVideos = useMemo(
    () => allVideos.filter((v) => videoMatchesUsage(v.status, usageFilter)),
    [allVideos, usageFilter]
  );

  // ---------------------------------------------------------------------------
  // ALL IMAGES (product-scoped, usage filter NOT applied)
  // ---------------------------------------------------------------------------
  const allImages = useMemo((): (SelectableImage & { usedInCampaigns: string[] })[] => {
    if (!productId) return [];
    return imagesController.images
      .filter((i) => i.product.id === productId && i.status !== 'new')
      .map((i) => ({
        id: i.id,
        name: i.name,
        status: i.status,
        imageType: i.imageType,
        thumbnailUrl: i.thumbnailUrl,
        driveFileId: i.driveFileId,
        image_drive_link: i.image_drive_link,
        productId: i.product.id,
        usedInCampaigns: i.usedInCampaigns,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [imagesController.images, productId]);

  // ---------------------------------------------------------------------------
  // AVAILABLE IMAGES (visible list - usage filter applied)
  // ---------------------------------------------------------------------------
  const availableImages = useMemo(
    () => allImages.filter((i) => imageMatchesUsage(i, usageFilter)),
    [allImages, usageFilter]
  );

  // ---------------------------------------------------------------------------
  // RETURN
  // ---------------------------------------------------------------------------
  return {
    baseVideos,
    availableVideos,
    availableImages,
    allVideos,
    allImages,
  };
}
