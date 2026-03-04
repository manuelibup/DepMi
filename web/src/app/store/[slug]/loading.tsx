import React from 'react';
import styles from './page.module.css';
import { ProductCardSkeleton } from '@/components/Skeleton';

export default function Loading() {
    return (
        <main className={styles.container}>
            <header className={styles.cover}>
                <div style={{ width: '100%', height: '150px', background: 'var(--bg-elevated)', animation: 'shimmer 2s infinite linear' }} />
            </header>

            <section className={styles.profileContent}>
                <div className={styles.logo} style={{ background: 'var(--bg-elevated)', border: 'none' }} />

                <div className={styles.info}>
                    <div style={{ width: '60%', height: '24px', background: 'var(--bg-elevated)', borderRadius: '4px', marginBottom: '8px' }} />
                    <div style={{ width: '30%', height: '16px', background: 'var(--bg-elevated)', borderRadius: '4px', marginBottom: '16px' }} />
                    <div style={{ width: '80%', height: '14px', background: 'var(--bg-elevated)', borderRadius: '4px', marginBottom: '4px' }} />
                    <div style={{ width: '70%', height: '14px', background: 'var(--bg-elevated)', borderRadius: '4px' }} />
                </div>
            </section>

            <section className={styles.productsSection}>
                <h2 className={styles.sectionTitle}>Products</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                    <ProductCardSkeleton />
                    <ProductCardSkeleton />
                    <ProductCardSkeleton />
                    <ProductCardSkeleton />
                </div>
            </section>
        </main>
    );
}
