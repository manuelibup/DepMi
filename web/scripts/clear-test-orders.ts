/**
 * One-time script to delete all test orders.
 * Run: npx ts-node --project tsconfig.json scripts/clear-test-orders.ts
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const count = await prisma.order.count();
    console.log(`Found ${count} orders — deleting all...`);
    await prisma.orderItem.deleteMany({});
    await prisma.order.deleteMany({});
    console.log('Done. All orders and order items removed.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
