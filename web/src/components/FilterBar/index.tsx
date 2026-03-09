'use client';

import React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useScrollDirection } from '@/hooks/useScrollDirection';
import styles from './FilterBar.module.css';

// Label → URL category value (empty string = no filter)
const FILTERS: { label: string; value: string }[] = [
    { label: 'For You', value: '' },
    { label: 'Fashion', value: 'FASHION' },
    { label: 'Gadgets', value: 'GADGETS' },
    { label: 'Beauty', value: 'BEAUTY' },
    { label: 'Food', value: 'FOOD' },
    { label: 'Furniture', value: 'FURNITURE' },
    { label: 'Services', value: 'SERVICES' },
    { label: 'Transport', value: 'TRANSPORT' },
    { label: 'Other', value: 'OTHER' },
];

function FilterBarInner() {
    const isHeaderVisible = useScrollDirection();
    const searchParams = useSearchParams();
    const activeCategory = searchParams?.get('category') ?? '';

    return (
        <nav className={`${styles.wrapper} ${!isHeaderVisible ? styles.fullTop : ''}`}>
            <div className={styles.scroll}>
                {FILTERS.map((f) => {
                    const href = f.value ? `/?category=${f.value}` : '/';
                    const isActive = activeCategory === f.value;
                    return (
                        <Link
                            key={f.value || 'all'}
                            href={href}
                            className={`${styles.tab} ${isActive ? styles.active : ''}`}
                            scroll={false}
                        >
                            <div className={styles.tabContent}>
                                {f.label}
                                {isActive && <div className={styles.activeIndicator} />}
                            </div>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}

export default function FilterBar() {
    return (
        <React.Suspense fallback={<nav className={styles.wrapper}><div className={styles.scroll}>Loading...</div></nav>}>
            <FilterBarInner />
        </React.Suspense>
    );
}
