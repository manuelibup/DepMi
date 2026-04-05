'use client';

import React from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
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

const SORT_OPTIONS: { label: string; value: string; icon: string }[] = [
    { label: 'Newest', value: '', icon: '🕒' },
    { label: 'Price ↑', value: 'price_asc', icon: '↑' },
    { label: 'Price ↓', value: 'price_desc', icon: '↓' },
];

function FilterBarInner() {
    const isHeaderVisible = useScrollDirection();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const router = useRouter();
    const activeCategory = searchParams?.get('category') ?? '';
    const activeSort = searchParams?.get('sort') ?? '';

    const buildHref = (category: string, sort?: string) => {
        const params = new URLSearchParams();
        if (category) params.set('category', category);
        const s = sort ?? activeSort;
        if (s) params.set('sort', s);
        const qs = params.toString();
        return qs ? `${pathname}?${qs}` : pathname;
    };

    const handleSortChange = (sortValue: string) => {
        const params = new URLSearchParams(searchParams?.toString());
        if (sortValue) params.set('sort', sortValue);
        else params.delete('sort');
        const qs = params.toString();
        router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    };

    return (
        <nav className={`${styles.wrapper} ${!isHeaderVisible ? styles.fullTop : ''}`}>
            <div className={styles.filterRow}>
                <div className={styles.scroll}>
                    {FILTERS.map((f) => {
                        const href = buildHref(f.value);
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

                <div className={styles.sortWrap}>
                    {SORT_OPTIONS.map(opt => (
                        <button
                            key={opt.value}
                            type="button"
                            className={`${styles.sortPill} ${activeSort === opt.value ? styles.sortPillActive : ''}`}
                            onClick={() => handleSortChange(opt.value)}
                            title={opt.label}
                        >
                            {opt.icon}
                        </button>
                    ))}
                </div>
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
