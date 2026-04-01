/**
 * Backfill slugs for existing products that don't have one.
 * Run once: node web/scripts/backfill-product-slugs.js
 *
 * Slug format: {title-slug}-{store-name-slug}
 * Collisions resolved by appending -2, -3, etc. (same as create API).
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function slugify(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/[\s_]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

async function generateSlug(title, storeName) {
    const base = `${slugify(title)}-${slugify(storeName)}`;
    let slug = base;
    let n = 1;
    while (true) {
        const existing = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
        if (!existing) return slug;
        n++;
        slug = `${base}-${n}`;
    }
}

async function main() {
    const products = await prisma.product.findMany({
        where: { slug: null },
        select: { id: true, title: true, store: { select: { name: true } } },
        orderBy: { createdAt: 'asc' },
    });

    console.log(`Found ${products.length} products without slugs\n`);

    let success = 0;
    let failed = 0;

    for (const product of products) {
        try {
            const slug = await generateSlug(product.title, product.store.name);
            await prisma.product.update({ where: { id: product.id }, data: { slug } });
            console.log(`  ✓ "${product.title}" → ${slug}`);
            success++;
        } catch (err) {
            console.error(`  ✗ "${product.title}" (${product.id.slice(0, 8)}) — ${err.message}`);
            failed++;
        }
    }

    console.log(`\nDone. ${success} updated, ${failed} failed.`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
