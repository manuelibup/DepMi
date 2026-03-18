import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { unstable_cache } from 'next/cache';
import styles from './page.module.css';

import WaitlistHome from '@/components/WaitlistHome';
import Header from '@/components/Header';
import FilterBar from '@/components/FilterBar';
import StoriesBar from '@/components/StoriesBar';
import BottomNav from '@/components/BottomNav';
import EmptyState from '@/components/EmptyState';
import LandingPage from '@/components/LandingPage';
import FeedInfiniteScroll from '@/components/FeedInfiniteScroll';
import type { FeedItem } from '@/components/FeedInfiniteScroll';
import RightSidebar from '@/components/RightSidebar';

const STORE_COLORS = ['#1A1D1F', '#0984E3', '#00B894', '#D63031', '#6C5CE7', '#E17055'];
const INITIAL_TAKE = 10;

export default async function Home({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  if (process.env.NEXT_PUBLIC_SHOW_WAITLIST === 'true') {
    return <WaitlistHome />;
  }

  const session = await getServerSession(authOptions);

  if (!session) {
    let stats = { users: 0, stores: 0, listings: 0 };
    try {
      const getLandingStats = unstable_cache(
        async () => {
          const [userCount, storeCount, listingCount] = await Promise.all([
            prisma.user.count(),
            prisma.store.count({ where: { isActive: true } }),
            prisma.product.count({ where: { inStock: true } }),
          ]);
          return { users: userCount, stores: storeCount, listings: listingCount };
        },
        ['platform-stats'],
        { revalidate: 300 },
      );
      stats = await getLandingStats();
    } catch { /* DB unavailable — show landing page with zero stats */ }
    return <LandingPage stats={stats} />;
  }

  if (session?.user && !session.user.username) {
    redirect('/onboarding');
  }

  // Username Repair Gatekeeper
  if (session?.user?.username && /\s/.test(session.user.username)) {
    redirect('/onboarding?repair=1');
  }

  const sp = await searchParams;
  const category = sp.category;
  const userId = session.user.id;

  const productWhere: Record<string, unknown> = { stock: { gt: 0 } };
  const demandWhere: Record<string, unknown> = { isActive: true };
  if (category) {
    productWhere.category = category as string;
    demandWhere.category = category as string;
  }

  const [rawProducts, rawDemands, topStores] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma.product as any).findMany({
      where: productWhere,
      orderBy: { createdAt: 'desc' },
      take: INITIAL_TAKE,
      include: {
        store: { select: { name: true, slug: true, depCount: true, depTier: true, id: true, ownerId: true, owner: { select: { username: true } } } },
        images: true,
        _count: { select: { likes: true, saves: true, comments: true } },
        ...(userId ? {
          likes: { where: { userId }, select: { id: true } },
          saves: { where: { userId }, select: { id: true } },
        } : {}),
      },
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma.demand as any).findMany({
      where: demandWhere,
      orderBy: { createdAt: 'desc' },
      take: INITIAL_TAKE,
      include: {
        user: { select: { displayName: true, username: true, avatarUrl: true } },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        _count: { select: { bids: true, comments: true, likes: true } as any },
        images: { orderBy: { order: 'asc' }, take: 3, select: { url: true } },
        ...(userId ? {
          likes: { where: { userId }, select: { id: true } },
          saves: { where: { userId }, select: { id: true } },
        } : {}),
      },
    }),
    prisma.store.findMany({
      where: { isActive: true },
      orderBy: { depCount: 'desc' },
      take: 8,
      select: { id: true, name: true, slug: true, logoUrl: true, depCount: true },
    }),
  ]);

  // Serialize products → FeedItem[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const products: FeedItem[] = rawProducts.map((p: any) => ({
    type: 'product' as const,
    createdAt: p.createdAt.toISOString(),
    data: {
      id: p.id,
      store: p.store.name,
      storeSlug: p.store.slug,
      storeInitial: p.store.name.charAt(0).toUpperCase(),
      storeColor: STORE_COLORS[p.store.name.length % STORE_COLORS.length],
      deps: p.store.depCount,
      depTier: p.store.depTier.toLowerCase(),
      title: p.title,
      price: `₦${Number(p.price).toLocaleString()}`,
      location: 'Nationwide',
      image: p.images?.[0]?.url ?? '',
      viewers: p.viewCount,
      ownerId: p.store.ownerId,
      ownerUsername: p.store.owner.username,
      likeCount: p._count.likes,
      saveCount: p._count.saves,
      commentCount: p._count.comments,
      stock: p.stock,
      inStock: p.inStock,
      isLiked: userId ? (p.likes?.length > 0) : false,
      isSaved: userId ? (p.saves?.length > 0) : false,
    },
  }));

  // Serialize demands → FeedItem[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const demands: FeedItem[] = rawDemands.map((d: any) => ({
    type: 'demand' as const,
    createdAt: d.createdAt.toISOString(),
    data: {
      id: d.id,
      username: d.user.username ?? undefined,
      user: d.user.displayName,
      initials: (d.user.displayName || d.user.username || '??').substring(0, 2).toUpperCase(),
      avatarUrl: d.user.avatarUrl ?? null,
      timeAgo: new Date(d.createdAt).toLocaleDateString(),
      text: d.text || '',
      budget: `₦${Number(d.budget).toLocaleString()}`,
      budgetMin: d.budgetMin ? `₦${Number(d.budgetMin).toLocaleString()}` : null,
      bids: d._count.bids,
      commentCount: d._count.comments,
      likeCount: d._count.likes,
      viewCount: d.viewCount,
      isLiked: userId ? (d.likes?.length > 0) : false,
      isSaved: userId ? (d.saves?.length > 0) : false,
      location: d.location ?? null,
      images: d.images.map((img: { url: string }) => img.url),
    },
  }));

  // Interleave (1 demand, 1 product pattern matching existing behavior)
  const initialItems: FeedItem[] = [];
  const maxLen = Math.max(products.length, demands.length);
  for (let i = 0; i < maxLen; i++) {
    if (demands[i]) initialItems.push(demands[i]);
    if (products[i]) initialItems.push(products[i]);
  }

  // Cursors for the client to request the next page
  const initialProductCursor = rawProducts.length === INITIAL_TAKE
    ? rawProducts[rawProducts.length - 1].createdAt.toISOString()
    : null;
  const initialDemandCursor = rawDemands.length === INITIAL_TAKE
    ? rawDemands[rawDemands.length - 1].createdAt.toISOString()
    : null;

  return (
    <main className={styles.main}>
      <Header />
      <FilterBar />
      <StoriesBar stores={topStores} />

      <div className={styles.pageLayout}>
        <div className={styles.feedCol}>
          <div className={styles.feed}>
            {initialItems.length === 0 ? (
              <EmptyState
                title="No activity yet"
                description="Be the first to list a product or request an item!"
                actionLabel="Post a Request"
                actionHref="/demand/new"
              />
            ) : (
              <FeedInfiniteScroll
                initialItems={initialItems}
                initialProductCursor={initialProductCursor}
                initialDemandCursor={initialDemandCursor}
                category={category}
                topStores={topStores}
              />
            )}
          </div>
        </div>

        <div className={styles.sidebarCol}>
          <RightSidebar />
        </div>
      </div>

      <BottomNav />
    </main>
  );
}
