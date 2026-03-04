import React from 'react';
import Header from '@/components/Header';
import FilterBar from '@/components/FilterBar';
import StoriesBar from '@/components/StoriesBar';
import BottomNav from '@/components/BottomNav';
import { ProductCardSkeleton, DemandCardSkeleton } from '@/components/Skeleton';
import styles from './page.module.css';

export default function Loading() {
    return (
        <main className={styles.main}>
            <Header />
            <FilterBar />
            <StoriesBar />

            <div className={styles.feed}>
                {/* Interleaved Skeletons */}
                <DemandCardSkeleton />
                <ProductCardSkeleton />
                <DemandCardSkeleton />
                <ProductCardSkeleton />
                <DemandCardSkeleton />
            </div>

            <BottomNav />
        </main>
    );
}
