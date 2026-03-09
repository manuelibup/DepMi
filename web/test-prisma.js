const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: "postgresql://neondb_owner:npg_kv3uQsLc7HlI@ep-plain-dream-aia8vqn1.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require",
        },
    },
    log: ['query', 'info', 'warn', 'error'],
});

async function main() {
    try {
        console.log('Testing Prisma connection...');
        const count = await prisma.demand.count();
        console.log('Successfully reached database with Prisma!');
        console.log('Demand count:', count);
    } catch (error) {
        console.error('Prisma connection error:');
        console.error(error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
