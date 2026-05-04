/**
 * Cloudflare Images API Helper
 *
 * Handles deletion of images from Cloudflare Images (distinct from R2).
 * Calls the server-side proxy at /api/cloudflare/images/:id so the
 * Cloudflare API token never reaches the browser.
 */

import { getAuthToken } from '../../data/airtable-client';

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
    } catch {
        console.warn('Failed to extract image ID from URL:', url);
        return null;
    }
}

/**
 * Delete an image from Cloudflare Images via the server proxy.
 *
 * @param imageId - The Cloudflare Image ID
 * @returns true if deleted (or already gone), false on error
 */
export async function deleteCloudflareImage(imageId: string): Promise<boolean> {
    if (!imageId) return false;

    const token = getAuthToken();

    try {
        const response = await fetch(`/api/cloudflare/images/${encodeURIComponent(imageId)}`, {
            method: 'DELETE',
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        if (response.ok) {
            return true;
        }

        const errorText = await response.text().catch(() => '');
        console.warn(`[Cloudflare Images] Delete failed for ${imageId}: ${response.status} ${errorText}`);
        return false;
    } catch (err) {
        console.warn(`[Cloudflare Images] Delete request errored for ${imageId}:`, err);
        return false;
    }
}
