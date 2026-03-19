/**
 * Applies a "depmi.com" text watermark to a Cloudinary image URL.
 *
 * Inserts a delivery transformation before the version/public-id segment:
 *   l_text:Arial_15_bold:depmi.com,co_white,o_50,g_south_east,x_8,y_8
 *
 * Only modifies res.cloudinary.com URLs — returns all other URLs unchanged.
 * Safe to call on logos, banners, or any image where watermark isn't wanted
 * by checking the caller (only call on product images).
 */
export function withWatermark(url: string | null | undefined): string {
    if (!url) return ''
    if (!url.includes('res.cloudinary.com')) return url

    // Match: https://res.cloudinary.com/{cloud}/image/upload/{rest}
    const match = url.match(/^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/)
    if (!match) return url

    const [, base, rest] = match

    // Skip if watermark already applied
    if (rest.includes('l_text:')) return url

    // Cloudinary text overlay: font Arial 15px bold, white, 50% opacity, bottom-right
    const overlay = 'l_text:Arial_15_bold:depmi.com,co_white,o_50,g_south_east,x_8,y_8'

    return `${base}${overlay}/${rest}`
}
