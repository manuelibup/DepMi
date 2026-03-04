import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import styles from './page.module.css';
import Link from 'next/link';

import waitlistStyles from './page.module.css'; // assuming styles is named this way
import WaitlistHome from '@/components/WaitlistHome';
import Header from '@/components/Header';
import FilterBar from '@/components/FilterBar';
import StoriesBar from '@/components/StoriesBar';
import DemandCard from '@/components/DemandCard';
import ProductCard from '@/components/ProductCard';
import BottomNav from '@/components/BottomNav';
import EmptyState from '@/components/EmptyState';
import SuggestedProfiles from '@/components/SuggestedProfiles';

export default async function Home({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  if (process.env.NEXT_PUBLIC_SHOW_WAITLIST === 'true') {
    return <WaitlistHome />;
  }

  const session = await getServerSession(authOptions);

  if (session?.user && !session.user.username) {
    redirect('/onboarding');
  }

  const sp = await searchParams;
  const category = sp.category;


  // Fetch real products
  const products = await prisma.product.findMany({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    where: { inStock: true, ...(category ? { category: category as any } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: {
      store: { select: { name: true, slug: true, depCount: true, depTier: true, id: true } },
      images: true
    }
  });

  // Fetch real demands
  const demands = await prisma.demand.findMany({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    where: { isActive: true, ...(category ? { category: category as any } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: {
      user: { select: { displayName: true, username: true } },
      _count: { select: { bids: true } }
    }
  });

  // Fetch top active stores for stories bar & suggested profiles
  const topStores = await prisma.store.findMany({
    where: { isActive: true },
    orderBy: { depCount: 'desc' },
    take: 8,
    select: { id: true, name: true, slug: true, logoUrl: true, depCount: true }
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
      <StoriesBar stores={topStores} />

      <div className={styles.feed}>
        {feed.length === 0 ? (
          <EmptyState 
            title="No activity yet"
            description="Be the first to list a product or request an item!"
            actionLabel="Post a Request"
            actionHref="/demand/new"
          />
        ) : (
          feed.map((item, index) => {
            let cardContent = null;
            
            if (item.type === 'demand') {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const demand = item.data as any;
              const dData = {
                id: demand.id,
                user: demand.user.displayName,
                initials: demand.user.displayName.substring(0, 2).toUpperCase(),
                timeAgo: new Date(demand.createdAt).toLocaleDateString(),
                text: demand.text || '',
                budget: `₦${Number(demand.budget).toLocaleString()}`,
                bids: demand._count.bids,
              };
              cardContent = <DemandCard key={`d-${demand.id}`} data={dData} index={index} />;
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
                image: product.images && product.images.length > 0 ? product.images[0].url : '',
                viewers: product.viewCount,
                id: product.id,
              };
              cardContent = (
                <div key={`p-${product.id}`} style={{ display: 'block' }}>
                  <ProductCard data={pData} index={index} />
                </div>
              );
            }
            
            // Inject SuggestedProfiles after the 3rd feed item (index 2)
            if (index === 2 && topStores.length > 0) {
                return (
                    <React.Fragment key={`feed-item-${index}`}>
                        {cardContent}
                        <SuggestedProfiles stores={topStores} />
                    </React.Fragment>
                );
            }
            
            return cardContent;
          })
        )}
      </div>

      <BottomNav />
    </main>
  );
}
