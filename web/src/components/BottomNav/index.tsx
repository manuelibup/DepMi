'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useAuthGate } from '@/context/AuthGate';
import { useScrollDirection } from '@/hooks/useScrollDirection';
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
        label: 'Search',
        href: '/search',
        icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
        ),
    },
    null, // Centre ➕ button placeholder
    {
        label: 'Messages',
        href: '/messages',
        badge: true,
        icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
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
    const { status } = useSession();
    const { openGate } = useAuthGate();
    const [stores, setStores] = useState<StoreInfo[]>([]);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [unreadMessages, setUnreadMessages] = useState(0);
    const isVisible = useScrollDirection();

    useEffect(() => {
        if (status !== 'authenticated') return;
        fetch('/api/user/stores')
            .then((r) => r.json())
            .then((data) => setStores(data.stores ?? []))
            .catch(() => {});
        fetch('/api/messages/unread-count')
            .then((r) => r.json())
            .then((data) => setUnreadMessages(data.count ?? 0))
            .catch(() => {});
    }, [status]);

    const handleAddPress = useCallback(() => {
        if (status === 'unauthenticated') {
            openGate('post a request or list a product', pathname ?? '/');
            return;
        }
        setSheetOpen(true);
    }, [status, openGate, pathname]);

    const closeSheet = useCallback(() => setSheetOpen(false), []);

    return (
        <>
            {/* Smart ➕ bottom sheet */}
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
                            <span className={styles.sheetOptionIcon}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                            </span>
                            <div>
                                <p className={styles.sheetOptionLabel}>Post a Request</p>
                                <p className={styles.sheetOptionDesc}>Ask sellers to find what you need</p>
                            </div>
                        </Link>
                        <div className={styles.sheetDivider} />
                        <Link
                            href={stores.length > 0 ? `/store/${stores[0].slug}/products/new` : '/store/create'}
                            className={styles.sheetOption}
                            onClick={closeSheet}
                        >
                            <span className={styles.sheetOptionIcon}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
                            </span>
                            <div>
                                <p className={styles.sheetOptionLabel}>{stores.length > 0 ? 'Add a Product' : 'Open a Store'}</p>
                                <p className={styles.sheetOptionDesc}>{stores.length > 0 ? 'List a new item in your store' : 'Set up your store to start selling'}</p>
                            </div>
                        </Link>
                    </div>
                </div>
            )}

            <nav className={`${styles.nav} ${!isVisible ? styles.navHidden : ''}`}>
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

                    const badgeCount = item.badge ? unreadMessages : 0;

                    return (
                        <Link
                            key={item.label}
                            href={item.href}
                            className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                        >
                            <span className={styles.navIcon}>
                                {item.icon}
                                {badgeCount > 0 && (
                                    <span className={styles.badge}>{badgeCount > 9 ? '9+' : badgeCount}</span>
                                )}
                            </span>
                            <span className={styles.navLabel}>{item.label}</span>
                        </Link>
                    );
                })}
            </nav>
        </>
    );
}
