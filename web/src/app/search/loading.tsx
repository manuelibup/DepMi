import React from 'react';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import { ProductCardSkeleton } from '@/components/Skeleton';
import styles from './page.module.css';

export default function Loading() {
    return (
        <main className={styles.main}>
            <Header />

            {/* Fake Sticky Search Bar */}
            <div className={styles.searchHeader}>
                <div className={styles.searchInputWrap}>
                    <div style={{ width: '100%', height: '24px', background: 'var(--bg-elevated)', borderRadius: '8px' }} />
                </div>
            </div>

            {/* Organic Products Feed Loading */}
            <section className={styles.section} style={{ paddingTop: '24px' }}>
                <div className={styles.productsGrid}>
                    <ProductCardSkeleton />
                    <ProductCardSkeleton />
                    <ProductCardSkeleton />
                    <ProductCardSkeleton />
                    <ProductCardSkeleton />
                    <ProductCardSkeleton />
                </div>
            </section>

            <BottomNav />
        </main>
    );
}
