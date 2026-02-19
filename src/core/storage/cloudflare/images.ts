/**
 * Cloudflare Images API Helper
 *
 * Handles deletion of images from Cloudflare Images (distinct from R2).
 *
 * NOTE: Image deletion requires a server-side proxy to avoid exposing
 * Cloudflare API tokens in the browser bundle. Currently a no-op until
 * a /api/cloudflare/images proxy is implemented.
 */

/**
 * Extract Cloudflare Image ID from a delivery URL.
 * 
 * Format: https://imagedelivery.net/<ACCOUNT_HASH>/<IMAGE_ID>/<VARIANT>
 * Example: https://imagedelivery.net/abc-123/my-image-id/public
 */
export function extractImageIdFromUrl(url: string): string | null {
    if (!url || !url.includes('imagedelivery.net')) {
        return null;
    }

    try {
        const parts = url.split('/');
        if (parts.length >= 5) {
            return parts[4];
        }
        return null;
    } catch (e) {
        console.warn('Failed to extract image ID from URL:', url);
        return null;
    }
}

/**
 * Delete an image from Cloudflare Images.
 * 
 * @param imageId - The Cloudflare Image ID
 * @returns true if deleted or not found, false if error
 */
export async function deleteCloudflareImage(imageId: string): Promise<boolean> {
    // TODO: Implement server-side proxy at /api/cloudflare/images/:id (DELETE)
    // to handle deletion without exposing CF API tokens to the browser.
    console.warn(`[Cloudflare Images] Deletion skipped for ${imageId}: requires server-side proxy (not yet implemented).`);
    return false;
}
