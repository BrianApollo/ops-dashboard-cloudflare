/**
 * Video Metadata Extraction
 *
 * Extracts metadata (duration, resolution, etc.) from a video File
 * using the browser's HTMLVideoElement API. No external libraries needed.
 *
 * Returns null fields (not errors) when the browser can't decode the format.
 */

export interface VideoMetadata {
  firstUploadedAt: string;
  lastUploadedAt: string;
  durationSeconds: number | null;
  durationFormatted: string | null;
  width: number | null;
  height: number | null;
  fileSizeBytes: number;
  mimeType: string;
  originalFileName: string;
  extractedAt: string;
}

/** Timeout for metadata extraction (ms) */
const EXTRACT_TIMEOUT_MS = 10_000;

/**
 * Format seconds into "M:SS" or "H:MM:SS" string.
 */
function formatDuration(seconds: number): string {
  const totalSeconds = Math.round(seconds);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Extract metadata from a video File using a temporary <video> element.
 *
 * - Creates an object URL, loads it into a hidden video element
 * - Waits for `loadedmetadata` to read duration/resolution
 * - Cleans up the object URL and element
 * - Returns nulls for unreadable fields (upload still proceeds)
 */
export async function extractVideoMetadata(file: File): Promise<VideoMetadata> {
  const now = new Date().toISOString();
  const base: VideoMetadata = {
    firstUploadedAt: now,
    lastUploadedAt: now,
    durationSeconds: null,
    durationFormatted: null,
    width: null,
    height: null,
    fileSizeBytes: file.size,
    mimeType: file.type || 'application/octet-stream',
    originalFileName: file.name,
    extractedAt: now,
  };

  const objectUrl = URL.createObjectURL(file);

  try {
    const result = await new Promise<Partial<VideoMetadata>>((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';

      const timeout = setTimeout(() => {
        console.warn('[VideoMetadata] Timed out reading metadata');
        cleanup();
        resolve({});
      }, EXTRACT_TIMEOUT_MS);

      function cleanup() {
        clearTimeout(timeout);
        video.removeAttribute('src');
        video.load(); // Release resources
      }

      video.addEventListener('loadedmetadata', () => {
        const duration = isFinite(video.duration) ? video.duration : null;
        const width = video.videoWidth || null;
        const height = video.videoHeight || null;

        cleanup();
        resolve({
          durationSeconds: duration ? Math.round(duration * 100) / 100 : null,
          durationFormatted: duration ? formatDuration(duration) : null,
          width,
          height,
        });
      });

      video.addEventListener('error', () => {
        console.warn('[VideoMetadata] Could not decode video for metadata');
        cleanup();
        resolve({});
      });

      video.src = objectUrl;
    });

    return { ...base, ...result };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
