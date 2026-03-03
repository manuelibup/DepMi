import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import styles from './page.module.css';
import Link from 'next/link';

import WaitlistHome from '@/components/WaitlistHome';
import Header from '@/components/Header';
import FilterBar from '@/components/FilterBar';
import StoriesBar from '@/components/StoriesBar';
import DemandCard from '@/components/DemandCard';
import ProductCard from '@/components/ProductCard';
import BottomNav from '@/components/BottomNav';

export default async function Home() {
  if (process.env.NEXT_PUBLIC_SHOW_WAITLIST === 'true') {
    return <WaitlistHome />;
  }

  const session = await getServerSession(authOptions);

  if (session?.user && !session.user.username) {
    redirect('/onboarding');
  }

  // Fetch real products
  const products = await prisma.product.findMany({
    where: { inStock: true },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: {
      store: { select: { name: true, slug: true, depCount: true, depTier: true, id: true } },
      images: true
    }
  });

  // Fetch real demands
  const demands = await prisma.demand.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: {
      user: { select: { displayName: true, username: true } },
      _count: { select: { bids: true } }
    }
  });

  // Interleave them mathematically (e.g. 1 demand, 1 product, 1 demand, 1 product)
  const feed = [];
  const maxLength = Math.max(demands.length, products.length);
  for (let i = 0; i < maxLength; i++) {
    if (demands[i]) feed.push({ type: 'demand', data: demands[i] });
    if (products[i]) feed.push({ type: 'product', data: products[i] });
  }

  return (
    <main className={styles.main}>
      <Header />
      <FilterBar />
      <StoriesBar />

      <div className={styles.feed}>
        {feed.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 12px' }}>
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M7 7h.01M17 7h.01M7 17h.01M17 17h.01M12 12h.01M7 12h.01M17 12h.01M12 7h.01M12 17h.01" />
            </svg>
            <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>No activity yet</p>
            <p style={{ fontSize: '0.9rem' }}>Be the first to list a product or request an item!</p>
          </div>
        ) : (
          feed.map((item, index) => {
            if (item.type === 'demand') {
               
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const demand = item.data as any;
              const dData = {
                user: demand.user.displayName,
                initials: demand.user.displayName.substring(0, 2).toUpperCase(),
                timeAgo: new Date(demand.createdAt).toLocaleDateString(),
                text: `${demand.title || ''} ${demand.description || ''}`,
                budget: `₦${Number(demand.budget).toLocaleString()}`,
                bids: demand._count.bids,
              };
              return <DemandCard key={`d-${demand.id}`} data={dData} index={index} />;
            } else {
               
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const product = item.data as any;
              // Generate deterministic color based on store name
              const colors = ['#1A1D1F', '#0984E3', '#00B894', '#D63031', '#6C5CE7', '#E17055'];
              const colorIndex = product.store.name.length % colors.length;

              const pData = {
                store: product.store.name,
                storeInitial: product.store.name.charAt(0).toUpperCase(),
                storeColor: colors[colorIndex],
                deps: product.store.depCount,
                depTier: product.store.depTier.toLowerCase(),
                title: product.title,
                price: `₦${Number(product.price).toLocaleString()}`,
                location: 'Nationwide',
                image: product.images && product.images.length > 0 ? product.images[0].url : '/placeholder.png',
                viewers: product.viewCount,
                id: product.id,
              };
              return (
                <Link href={`/p/${product.id}`} key={`p-${product.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                  <ProductCard data={pData} index={index} />
                </Link>
              );
            }
          })
        )}
      </div>

      <BottomNav />
    </main>
  );
}
