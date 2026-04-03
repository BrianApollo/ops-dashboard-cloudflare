/**
 * Video upload module.
 *
 * Video-specific orchestration using Cloudflare R2 storage.
 * Throws on failure; caller handles orchestration.
 *
 * This is the SINGLE entry point for all video file uploads (regular + AI).
 * All callers MUST go through uploadVideoWithFolder().
 *
 * Upload Strategy:
 * 1. Files are uploaded to Cloudflare R2 with "{productStorageKey}/{subfolder}" prefix
 * 2. File is named using the Airtable record name
 * 3. Video metadata (duration, resolution, etc.) is extracted client-side
 *
 * INVARIANTS (enforced at runtime):
 * 1. A video URL may ONLY come from uploadFile() return value
 * 2. No URL generation via string concatenation or buildPublicUrl()
 * 3. If uploadFile() fails, no URL is returned and no Airtable write occurs
 * 4. URL must be from trustapollo.media domain
 *
 * ABSOLUTE RULES:
 * - Filename parsing is FORBIDDEN
 * - Cloudflare storage is the single source of truth for URLs
 */

import {
  uploadFile,
  deleteFile,
  extractVideoMetadata,
  type UploadProgress,
  type UploadResult,
  type VideoMetadata,
} from '../../core/storage/cloudflare';

// =============================================================================
// RE-EXPORTS
// =============================================================================

export { deleteFile };
export type { UploadProgress, UploadResult, VideoMetadata };

// =============================================================================
// TYPES
// =============================================================================

export interface VideoUploadOptions {
  /** Airtable record ID. Optional for new records (e.g., AI video creation). */
  videoId?: string;
  /** The video name from Airtable - used as the file name */
  videoName: string;
  file: File;
  /** The product slug/name (used as prefix for storage path). MUST NOT be an Airtable record ID. */
  productStorageKey: string;
  /** Storage subfolder. Default: 'Videos'. AI videos use 'AI-Videos'. */
  subfolder?: string;
  /** Existing Video Data JSON from Airtable. Used to preserve firstUploadedAt on re-upload. */
  existingVideoData?: string;
  onProgress?: (progress: UploadProgress) => void;
}

export interface VideoUploadResult {
  url: string;
  fileId: string;
  metadata: VideoMetadata | null;
}

// =============================================================================
// UPLOAD LOCK (prevent duplicate uploads per slot)
// =============================================================================

/**
 * Track in-flight uploads to prevent duplicates.
 * Key format: "{videoId}"
 */
const uploadLocks = new Set<string>();

/**
 * Check if an upload is already in progress for this video.
 */
export function isUploadInProgress(videoId: string): boolean {
  return uploadLocks.has(videoId);
}

// =============================================================================
// MAIN VIDEO UPLOAD FUNCTION
// =============================================================================

/**
 * Upload a video file to Cloudflare R2 storage.
 *
 * This is the GLOBAL entry point for all video uploads.
 * Both regular videos and AI videos MUST use this function.
 *
 * ALGORITHM:
 * 1. Validate productStorageKey exists
 * 2. Extract video metadata (duration, resolution, etc.)
 * 3. Upload file to R2 with prefix "{productStorageKey}/{subfolder}"
 * 4. File is named using videoName (Airtable record name)
 *
 * RULES:
 * - Filename content has ZERO effect on behavior
 * - productStorageKey determines storage path prefix
 *
 * @throws Error if productStorageKey is missing
 * @throws Error if upload is already in progress (when videoId provided)
 * @throws Error if upload fails
 */
export async function uploadVideoWithFolder(options: VideoUploadOptions): Promise<VideoUploadResult> {
  const { videoId, videoName, file, productStorageKey, subfolder = 'Videos', existingVideoData, onProgress } = options;

  // ==========================================================================
  // VALIDATION: Product storage key is REQUIRED
  // ==========================================================================
  if (!productStorageKey) {
    throw new Error(
      'Upload blocked: Product storage key is required for video upload.'
    );
  }

  // ==========================================================================
  // INVARIANT: Storage key must NOT be an Airtable record ID
  // ==========================================================================
  if (productStorageKey.startsWith('rec')) {
    throw new Error(
      `Invariant violation: Airtable record ID used as storage key. Got: "${productStorageKey}". Use product.name instead.`
    );
  }

  // Prevent duplicate uploads (only when videoId is provided)
  if (videoId) {
    if (uploadLocks.has(videoId)) {
      throw new Error('Upload already in progress for this video');
    }
    uploadLocks.add(videoId);
  }

  try {
    // ==========================================================================
    // VALIDATION: Airtable video name is REQUIRED
    // ==========================================================================
    if (!videoName || videoName.trim() === '') {
      throw new Error('Upload blocked: Airtable video name is required.');
    }

    // ==========================================================================
    // Extract extension from local file (ONLY use of file.name)
    // ==========================================================================
    const fileParts = file.name.split('.');
    if (fileParts.length < 2) {
      throw new Error(`Upload blocked: File "${file.name}" has no extension.`);
    }
    const extension = fileParts.pop()!.toLowerCase();
    if (!extension) {
      throw new Error(`Upload blocked: Could not extract extension from "${file.name}".`);
    }

    // ==========================================================================
    // Construct canonical filename: {AirtableVideoName}.{extension}
    // ==========================================================================
    const finalFilename = `${videoName}.${extension}`;

    console.log(`[Storage] Uploading video: ${finalFilename}`);
    console.log(`[Storage] Storage path: ${productStorageKey}/${subfolder}/${finalFilename}`);

    // ==========================================================================
    // Extract metadata + upload in parallel
    // ==========================================================================
    const [metadataResult, uploadResult] = await Promise.allSettled([
      extractVideoMetadata(file),
      uploadFile(
        file,
        finalFilename,
        {
          prefix: `${productStorageKey}/${subfolder}`,
          onProgress,
        }
      ),
    ]);

    // Upload failure is fatal
    if (uploadResult.status === 'rejected') {
      throw uploadResult.reason;
    }

    const result = uploadResult.value;

    // Metadata failure is non-fatal — log and continue
    let metadata = metadataResult.status === 'fulfilled' ? metadataResult.value : null;
    if (metadataResult.status === 'rejected') {
      console.warn('[Storage] Metadata extraction failed (non-fatal):', metadataResult.reason);
    } else {
      console.log(`[Storage] Metadata extracted: ${metadata?.durationFormatted ?? 'unknown'} duration, ${metadata?.width}x${metadata?.height}`);
    }

    // ==========================================================================
    // TIMESTAMP LOGIC:
    // - First upload: firstUploadedAt = now, lastUploadedAt = now
    // - Re-upload: preserve firstUploadedAt from existing data, update lastUploadedAt
    // ==========================================================================
    if (metadata && existingVideoData) {
      try {
        const existing = JSON.parse(existingVideoData);
        if (existing.firstUploadedAt) {
          metadata = { ...metadata, firstUploadedAt: existing.firstUploadedAt };
        }
      } catch {
        // Invalid existing JSON — use fresh timestamps
      }
    }

    // ==========================================================================
    // INVARIANT CHECKS: URL must exist and be valid
    // ==========================================================================
    if (!result.url) {
      throw new Error('Upload failed: No URL returned from storage worker');
    }

    if (!result.fileId) {
      throw new Error('Upload failed: No file key returned from storage worker');
    }

    // Validate URL is from the correct domain (trustapollo.media)
    if (!result.url.includes(import.meta.env.VITE_CF_R2_DOMAIN)) {
      throw new Error(
        `Upload failed: Invalid URL domain. Expected ${import.meta.env.VITE_CF_R2_DOMAIN}, got: ${result.url}`
      );
    }

    console.log(`[Storage] Upload complete. URL: ${result.url}`);

    return {
      url: result.url,
      fileId: result.fileId,
      metadata,
    };
  } finally {
    // Always release the lock
    if (videoId) {
      uploadLocks.delete(videoId);
    }
  }
}
