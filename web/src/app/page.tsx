'use client';

import React, { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import WaitlistHome from '@/components/WaitlistHome';

import Header from '@/components/Header';
import FilterBar from '@/components/FilterBar';
import StoriesBar from '@/components/StoriesBar';
import DemandCard from '@/components/DemandCard';
import type { DemandData } from '@/components/DemandCard';
import ProductCard from '@/components/ProductCard';
import type { ProductData } from '@/components/ProductCard';
import BottomNav from '@/components/BottomNav';

/* ── Mock Data ── */
const DEMAND_ITEMS: DemandData[] = [
  {
    user: 'Imaobong D.',
    initials: 'ID',
    timeAgo: '2h ago',
    text: 'I need a fairly used iPhone 13 Pro Max (128GB). Direct UK used, battery health above 85%. Uyo region only.',
    budget: '₦650,000',
    bids: 4,
    urgency: 'Closing in 6h',
  },
  {
    user: 'Chidi N.',
    initials: 'CN',
    timeAgo: '5h ago',
    text: 'Looking for original Nike Air Force 1 low, size 42. White on white. Must be boxed, no replicas.',
    budget: '₦45,000',
    bids: 2,
  },
];

const PRODUCT_ITEMS: ProductData[] = [
  {
    store: 'KicksBySam',
    storeInitial: 'K',
    storeColor: '#1A1D1F',
    deps: 450,
    depTier: 'trusted',
    title: 'Nike Air Jordan 1 Retro High',
    price: '₦85,000',
    location: 'Uyo, Akwa Ibom',
    image: '/sneakers.png',
    viewers: 12,
  },
  {
    store: 'GadgetHub',
    storeInitial: 'G',
    storeColor: '#0984E3',
    deps: 823,
    depTier: 'elite',
    title: 'iPhone 14 Pro Max 256GB — Deep Purple',
    price: '₦890,000',
    location: 'Lagos, Ikeja',
    image: '/iphone.png',
    viewers: 28,
  },
];

export default function Home() {
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session?.user && !session.user.username) {
      router.push('/onboarding');
    }
  }, [session, router]);

  if (process.env.NEXT_PUBLIC_SHOW_WAITLIST === 'true') {
    return <WaitlistHome />;
  }

  return (
    <main className={styles.main}>
      <Header />
      <FilterBar />
      <StoriesBar />

      <div className={styles.feed}>
        {/* Interleave demand and product cards */}
        <DemandCard data={DEMAND_ITEMS[0]} index={0} />
        <ProductCard data={PRODUCT_ITEMS[0]} index={1} />
        <DemandCard data={DEMAND_ITEMS[1]} index={2} />
        <ProductCard data={PRODUCT_ITEMS[1]} index={3} />
      </div>

      <BottomNav />
    </main>
  );
}
