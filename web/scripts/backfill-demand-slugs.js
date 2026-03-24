/**
 * Backfill slugs for existing demands that don't have one.
 * Run once: node web/scripts/backfill-demand-slugs.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function generateDemandSlug(text, id) {
    const base = text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 50)
        .replace(/-$/, '');
    const suffix = id.slice(0, 8);
    return `${base}-${suffix}`;
}

async function main() {
    const demands = await prisma.demand.findMany({
        where: { slug: null },
        select: { id: true, text: true },
    });

    console.log(`Found ${demands.length} demands without slugs`);

    let success = 0;
    let failed = 0;

    for (const demand of demands) {
        const slug = generateDemandSlug(demand.text, demand.id);
        try {
            await prisma.demand.update({
                where: { id: demand.id },
                data: { slug },
            });
            console.log(`  ✓ ${demand.id.slice(0, 8)} → ${slug}`);
            success++;
        } catch (err) {
            console.error(`  ✗ ${demand.id.slice(0, 8)} — ${err.message}`);
            failed++;
        }
    }

    console.log(`\nDone. ${success} updated, ${failed} failed.`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
