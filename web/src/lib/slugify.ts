/** Convert a string to a URL-safe slug.
 *  "Dell XPS 15!" → "dell-xps-15"
 */
export function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // strip special characters
        .trim()
        .replace(/[\s_]+/g, '-')       // spaces/underscores → hyphens
        .replace(/-+/g, '-')           // collapse consecutive hyphens
        .replace(/^-|-$/g, '');        // trim leading/trailing hyphens
}

/**
 * Generate a unique product slug from title + store name.
 * Handles collisions by appending -2, -3, etc. (same as Substack/Ghost/WordPress).
 *
 * @param title      Product title
 * @param storeName  Store name (used as a namespace to prevent cross-store collisions)
 * @param lookup     A function that checks if a given slug already exists
 */
export async function generateProductSlug(
    title: string,
    storeName: string,
    lookup: (slug: string) => Promise<{ id: string } | null>
): Promise<string> {
    const base = `${slugify(title)}-${slugify(storeName)}`;

    let slug = base;
    let n = 1;

    while (true) {
        const existing = await lookup(slug);
        if (!existing) return slug;
        n++;
        slug = `${base}-${n}`;
    }
}
