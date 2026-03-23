/**
 * Inject Cloudinary transformation params into an upload URL.
 * Converts images to auto format (WebP/AVIF), auto quality, and a capped width.
 *
 * Example:
 *   .../upload/v123/depmi_upload/img.jpg
 * → .../upload/f_auto,q_auto,w_700/v123/depmi_upload/img.jpg
 */
export function cloudinaryTransform(url: string, width: number): string {
    if (!url || !url.includes('res.cloudinary.com')) return url;
    // Don't double-transform if already transformed
    if (url.includes('/upload/f_auto')) return url;
    return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width},c_limit/`);
}
