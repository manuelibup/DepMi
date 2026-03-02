'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useAuthGate } from '@/context/AuthGate';
import styles from './BottomNav.module.css';

type StoreInfo = { slug: string; name: string };

const NAV_TABS = [
    {
        label: 'Home',
        href: '/',
        icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.1L1 12h3v9h6v-6h4v6h6v-9h3L12 2.1z" />
            </svg>
        ),
    },
    {
        label: 'Requests',
        href: '/requests',
        icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
        ),
    },
    null, // Centre ➕ button placeholder
    {
        label: 'Orders',
        href: '/orders',
        icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
        ),
    },
    {
        label: 'Profile',
        href: '/profile',
        icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
            </svg>
        ),
    },
];

export default function BottomNav() {
    const pathname = usePathname();
    const router = useRouter();
    const { status } = useSession();
    const { openGate } = useAuthGate();
    const [stores, setStores] = useState<StoreInfo[]>([]);
    const [sheetOpen, setSheetOpen] = useState(false);

    // Fetch user's stores once authenticated
    useEffect(() => {
        if (status !== 'authenticated') return;
        fetch('/api/user/stores')
            .then((r) => r.json())
            .then((data) => setStores(data.stores ?? []))
            .catch(() => {});
    }, [status]);

    const handleAddPress = useCallback(() => {
        if (status === 'unauthenticated') {
            openGate('post a request or list a product', pathname ?? '/');
            return;
        }
        if (stores.length > 0) {
            setSheetOpen(true);
        } else {
            // Buyer with no store — go straight to post a request
            router.push('/demand/new');
        }
    }, [status, stores, router, openGate, pathname]);

    const closeSheet = useCallback(() => setSheetOpen(false), []);

    return (
        <>
            {/* Smart ➕ bottom sheet — only shown to store owners */}
            {sheetOpen && (
                <div className={styles.sheetOverlay} onClick={closeSheet}>
                    <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.sheetHandle} />
                        <p className={styles.sheetTitle}>What do you want to do?</p>
                        <Link
                            href="/demand/new"
                            className={styles.sheetOption}
                            onClick={closeSheet}
                        >
                            <span className={styles.sheetOptionIcon}>📣</span>
                            <div>
                                <p className={styles.sheetOptionLabel}>Post a Request</p>
                                <p className={styles.sheetOptionDesc}>Ask sellers to find what you need</p>
                            </div>
                        </Link>
                        <Link
                            href={`/store/${stores[0].slug}/products/new`}
                            className={styles.sheetOption}
                            onClick={closeSheet}
                        >
                            <span className={styles.sheetOptionIcon}>📦</span>
                            <div>
                                <p className={styles.sheetOptionLabel}>Add a Product</p>
                                <p className={styles.sheetOptionDesc}>List a new item in your store</p>
                            </div>
                        </Link>
                    </div>
                </div>
            )}

            <nav className={styles.nav}>
                {NAV_TABS.map((item) => {
                    // Centre ➕ button
                    if (item === null) {
                        return (
                            <div key="add" className={styles.addWrap}>
                                <button
                                    className={styles.addBtn}
                                    onClick={handleAddPress}
                                    aria-label="Create"
                                >
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="12" y1="5" x2="12" y2="19" />
                                        <line x1="5" y1="12" x2="19" y2="12" />
                                    </svg>
                                </button>
                            </div>
                        );
                    }

                    // Home only active on exact match; others use startsWith
                    const isActive = item.href === '/'
                        ? pathname === '/'
                        : pathname?.startsWith(item.href);

                    // Profile tab: show auth gate for guests instead of hard redirect
                    if (item.label === 'Profile' && status === 'unauthenticated') {
                        return (
                            <button
                                key={item.label}
                                className={`${styles.navItem} ${styles.navBtn}`}
                                onClick={() => openGate('view your profile', pathname ?? '/')}
                                aria-label="Profile"
                            >
                                <span className={styles.navIcon}>{item.icon}</span>
                                <span className={styles.navLabel}>{item.label}</span>
                            </button>
                        );
                    }

                    return (
                        <Link
                            key={item.label}
                            href={item.href}
                            className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                        >
                            <span className={styles.navIcon}>{item.icon}</span>
                            <span className={styles.navLabel}>{item.label}</span>
                        </Link>
                    );
                })}
            </nav>
        </>
    );
}
