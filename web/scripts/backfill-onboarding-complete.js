/**
 * Backfill: set onboardingComplete = true for all users who already have a username.
 * Run once: node scripts/backfill-onboarding-complete.js
 */

require('dotenv').config({ path: '.env.local' });

const { PrismaClient } = require('@prisma/client');

// Use direct connection (not pooler) for scripts
const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
const prisma = new PrismaClient({ datasources: { db: { url } } });

async function main() {
    const result = await prisma.user.updateMany({
        where: {
            username: { not: null },
            onboardingComplete: false,
        },
        data: { onboardingComplete: true },
    });

    console.log(`Backfilled ${result.count} users — onboardingComplete = true`);
}

main()
    .catch(e => { console.error(e.message); process.exit(1); })
    .finally(() => prisma.$disconnect());
