
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting Count Backfill ---');

  // 1. Products
  console.log('Backfilling Product counts...');
  const products = await prisma.product.findMany({
    include: {
      _count: {
        select: { likes: true, saves: true, comments: true }
      }
    }
  });

  for (const p of products) {
    await prisma.product.update({
      where: { id: p.id },
      data: {
        likeCount: p._count.likes,
        saveCount: p._count.saves,
        commentCount: p._count.comments,
      }
    });
  }
  console.log(`Updated ${products.length} products.`);

  // 2. Demands
  console.log('Backfilling Demand counts...');
  const demands = await prisma.demand.findMany({
    include: {
      _count: {
        select: { likes: true, saves: true, comments: true, bids: true }
      }
    }
  });

  for (const d of demands) {
    await prisma.demand.update({
      where: { id: d.id },
      data: {
        likeCount: d._count.likes,
        saveCount: d._count.saves,
        commentCount: d._count.comments,
        bidCount: d._count.bids,
      }
    });
  }
  console.log(`Updated ${demands.length} demands.`);

  // 3. Posts
  console.log('Backfilling Post counts...');
  const posts = await prisma.post.findMany({
    include: {
      _count: {
        select: { likes: true, comments: true }
      }
    }
  });

  for (const post of posts) {
    await prisma.post.update({
      where: { id: post.id },
      data: {
        likeCount: post._count.likes,
        commentCount: post._count.comments,
        // saveCount: 0 // currently not implemented for posts
      }
    });
  }
  console.log(`Updated ${posts.length} posts.`);

  // 4. Stores
  console.log('Backfilling Store like counts...');
  const stores = await prisma.store.findMany({
    include: {
      _count: {
        select: { followers: true }
      }
    }
  });

  for (const s of stores) {
    // Note: Store only had followers/likes in some contexts. 
    // We already apply schema counts for Product/Demand/Post.
    // Store already has likeCount/commentCount columns as well.
    await prisma.store.update({
      where: { id: s.id },
      data: {
        likeCount: s._count.followers, // Reusing column for followers to save compute
      }
    });
  }

  console.log('--- Backfill Complete ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
