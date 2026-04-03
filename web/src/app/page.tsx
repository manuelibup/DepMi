import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import styles from './page.module.css';

import WaitlistHome from '@/components/WaitlistHome';
import LandingPage from '@/components/LandingPage';
import Header from '@/components/Header';
import FilterBar from '@/components/FilterBar';
import StoriesBar from '@/components/StoriesBar';
import BottomNav from '@/components/BottomNav';
import EmptyState from '@/components/EmptyState';
import FeedInfiniteScroll from '@/components/FeedInfiniteScroll';
import type { FeedItem } from '@/components/FeedInfiniteScroll';
import RightSidebar from '@/components/RightSidebar';

const STORE_COLORS = ['#1A1D1F', '#0984E3', 'var(--primary)', '#D63031', '#6C5CE7', '#E17055'];
const INITIAL_TAKE = 10;

export default async function Home({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  if (process.env.NEXT_PUBLIC_SHOW_WAITLIST === 'true') {
    return <WaitlistHome />;
  }

  const session = await getServerSession(authOptions);

  // Guests see the landing page
  if (!session) {
    const [users, stores, listings] = await Promise.all([
      prisma.user.count(),
      prisma.store.count({ where: { isActive: true } }),
      prisma.product.count({ where: { inStock: true } }),
    ]);
    return <LandingPage stats={{ users, stores, listings }} />;
  }

  // Onboarding redirects — only for logged-in users
  if (session?.user && !session.user.username) {
    redirect('/onboarding');
  }
  if (session?.user?.username && /\s/.test(session.user.username)) {
    redirect('/onboarding?repair=1');
  }

  const sp = await searchParams;
  const category = sp.category;
  const userId = session?.user?.id ?? null;

  const productWhere: Record<string, unknown> = { stock: { gt: 0 } };
  const demandWhere: Record<string, unknown> = { isActive: true };
  if (category) {
    productWhere.category = category as string;
    demandWhere.category = category as string;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let rawProducts: any[] = [], rawDemands: any[] = [], rawPosts: any[] = [], topStores: any[] = [];
  try {
  [rawProducts, rawDemands, rawPosts, topStores] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma.product as any).findMany({
      where: productWhere,
      orderBy: { createdAt: 'desc' },
      take: INITIAL_TAKE,
      include: {
        store: { select: { name: true, slug: true, logoUrl: true, depCount: true, depTier: true, id: true, ownerId: true, owner: { select: { username: true } } } },
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
    prisma.post.findMany({
      orderBy: { createdAt: 'desc' },
      take: INITIAL_TAKE,
      include: {
        store: { select: { slug: true } },
        author: { select: { displayName: true, username: true, avatarUrl: true } },
        images: { select: { url: true } },
        ...(userId ? { likes: { where: { userId }, select: { id: true } } } : {}),
      },
    }),
    prisma.store.findMany({
      where: { isActive: true },
      orderBy: { depCount: 'desc' },
      take: 8,
      select: { id: true, name: true, slug: true, logoUrl: true, depCount: true },
    }),
  ]);
  } catch { /* DB unavailable — render empty feed */ }

  // Serialize products → FeedItem[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const products: FeedItem[] = rawProducts.map((p: any) => ({
    type: 'product' as const,
    createdAt: p.createdAt.toISOString(),
    data: {
      id: p.id,
      slug: p.slug ?? null,
      store: p.store.name,
      storeSlug: p.store.slug,
      storeInitial: p.store.name.charAt(0).toUpperCase(),
      storeColor: STORE_COLORS[p.store.name.length % STORE_COLORS.length],
      logoUrl: p.store.logoUrl ?? null,
      deps: p.store.depCount,
      depTier: p.store.depTier.toLowerCase(),
      title: p.title,
      price: `₦${Number(p.price).toLocaleString()}`,
      location: 'Nationwide',
      image: p.images?.[0]?.url ?? '',
      images: (p.images ?? []).map((img: { url: string }) => img.url),
      videoUrl: p.videoUrl ?? null,
      viewers: p.viewCount,
      ownerId: p.store.ownerId,
      ownerUsername: p.store.owner.username,
      likeCount: p._count.likes,
      saveCount: p._count.saves,
      commentCount: p._count.comments,
      stock: p.stock,
      inStock: p.inStock,
      isDigital: p.isDigital ?? false,
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

  // Serialize posts → FeedItem[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const posts: FeedItem[] = rawPosts.map((p: any) => ({
    type: 'post' as const,
    createdAt: p.createdAt.toISOString(),
    data: {
      id: p.id,
      body: p.body,
      type: p.type as 'POST' | 'ANNOUNCEMENT',
      likeCount: p.likeCount,
      commentCount: p.commentCount,
      createdAt: p.createdAt.toISOString(),
      storeSlug: p.store.slug,
      author: {
        displayName: p.author.displayName ?? null,
        username: p.author.username ?? null,
        avatarUrl: p.author.avatarUrl ?? null,
      },
      images: p.images.map((img: { url: string }) => ({ url: img.url })),
      isLiked: userId ? (p.likes?.length > 0) : false,
    },
  }));

  // Merge and sort chronologically (newest first)
  const initialItems: FeedItem[] = [...products, ...demands, ...posts]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, INITIAL_TAKE);

  // Single cursor — the oldest item's timestamp
  const initialCursor = initialItems.length === INITIAL_TAKE
    ? initialItems[initialItems.length - 1].createdAt
    : null;

  return (
    <main className={styles.main}>
      <Header />
      {!session && (
        <div className={styles.guestBanner}>
          <span>You&apos;re browsing as a guest &mdash; sign up to buy, sell &amp; save</span>
          <div className={styles.guestActions}>
            <Link href="/" className={styles.guestSignup}>Join free</Link>
            <Link href="/login" className={styles.guestLogin}>Log in</Link>
          </div>
        </div>
      )}
      <div className={styles.pageLayout}>
        <div className={styles.feedCol}>
          <FilterBar />
          <StoriesBar stores={topStores} />
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
                initialCursor={initialCursor}
                category={category}
                topStores={topStores}
                sessionUserId={userId ?? undefined}
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
