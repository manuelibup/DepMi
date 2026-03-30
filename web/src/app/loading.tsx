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
                <div style={{
                    textAlign: 'center',
                    padding: '20px 16px 4px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '10px',
                }}>
                    <div style={{
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--primary) 0%, #FF8264 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                            <line x1="3" y1="6" x2="21" y2="6" />
                            <path d="M16 10a4 4 0 0 1-8 0" />
                        </svg>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                        Curating your feed…
                    </p>
                </div>

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
