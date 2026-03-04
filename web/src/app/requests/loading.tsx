import React from 'react';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import { DemandCardSkeleton } from '@/components/Skeleton';
import styles from './Requests.module.css';

export default function Loading() {
    return (
        <main className={styles.container}>
            <Header />
            
            <div className={styles.searchHeader}>
                <h1 className={styles.title}>Demand Engine</h1>
                <p className={styles.subtitle}>Browse active requests and bid with your products.</p>
                <div className={styles.searchForm}>
                    <div style={{ width: '100%', height: '44px', background: 'var(--bg-elevated)', borderRadius: '12px' }} />
                </div>
            </div>

            <div className={styles.feed}>
                <DemandCardSkeleton />
                <DemandCardSkeleton />
                <DemandCardSkeleton />
                <DemandCardSkeleton />
            </div>

            <BottomNav />
        </main>
    );
}
