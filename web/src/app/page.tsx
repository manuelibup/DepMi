import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import styles from './page.module.css';

import { getCachedFeedPage, getCachedTopStores, personalizeItems } from '@/lib/feed';
import WaitlistHome from '@/components/WaitlistHome';
import Header from '@/components/Header';
import FilterBar from '@/components/FilterBar';
import StoriesBar from '@/components/StoriesBar';
import BottomNav from '@/components/BottomNav';
import EmptyState from '@/components/EmptyState';
import FeedInfiniteScroll from '@/components/FeedInfiniteScroll';
import RightSidebar from '@/components/RightSidebar';

const INITIAL_TAKE = 24;

export default async function Home({ searchParams }: { searchParams: Promise<{ category?: string; sort?: string }> }) {
  if (process.env.NEXT_PUBLIC_SHOW_WAITLIST === 'true') {
    return <WaitlistHome />;
  }

  const session = await getServerSession(authOptions);

  // Onboarding redirects — only for logged-in users
  if (session?.user && !session.user.username) {
    redirect('/onboarding');
  }
  if (session?.user?.username && /\s/.test(session.user.username)) {
    redirect('/onboarding?repair=1');
  }

  const sp = await searchParams;
  const category = sp.category;
  const sort = sp.sort;
  const userId = session?.user?.id ?? null;

  // Use cached feed data (shared across all users)
  const { items: baseItems, nextCursor } = await getCachedFeedPage(null, category, INITIAL_TAKE, sort);
  
  // Use cached top stores (shared)
  const topStores = await getCachedTopStores();

  // Personalize only for the current user (lightweight query)
  const initialItems = await personalizeItems(baseItems, userId);

  return (
    <main className={styles.main}>
      <Header />
      {!session && (
        <div className={styles.guestBanner}>
          <span>You&apos;re browsing as a guest &mdash; sign up to buy, sell &amp; save</span>
          <div className={styles.guestActions}>
            <Link href="/welcome" className={styles.guestSignup}>Join free</Link>
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
                initialCursor={nextCursor}
                category={category}
                sort={sort}
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

