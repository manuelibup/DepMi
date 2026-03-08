
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: "postgresql://neondb_owner:npg_kv3uQsLc7HlI@ep-plain-dream-aia8vqn1.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require"
        }
    }
});

async function main() {
    console.log("Attempting to connect to database...");
    try {
        const userCount = await prisma.user.count();
        console.log("Success! User count:", userCount);
    } catch (error) {
        console.error("Database connection failed:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
