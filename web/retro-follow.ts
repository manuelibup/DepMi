import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  console.log("Fetching past confirmed orders...");
  const orders = await prisma.order.findMany({
    where: { status: { in: ['CONFIRMED', 'SHIPPED', 'DELIVERED', 'COMPLETED'] } },
    select: { buyerId: true, sellerId: true, seller: { select: { ownerId: true } } }
  });

  console.log(`Found ${orders.length} orders.`);
  
  for (const order of orders) {
    // Follow store
    await prisma.storeFollow.upsert({
      where: { userId_storeId: { userId: order.buyerId, storeId: order.sellerId } },
      create: { userId: order.buyerId, storeId: order.sellerId },
      update: {}
    });

    // Follow store owner
    await prisma.userFollow.upsert({
      where: { followerId_followingId: { followerId: order.buyerId, followingId: order.seller.ownerId } },
      create: { followerId: order.buyerId, followingId: order.seller.ownerId },
      update: {}
    });
  }
  console.log("Done!");
}
run().catch(console.error).finally(() => prisma.$disconnect());
