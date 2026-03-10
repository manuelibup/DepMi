'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useAuthGate } from '@/context/AuthGate';
import styles from './DesktopSidebar.module.css';

type StoreInfo = { slug: string; name: string };

const NAV_ITEMS = [
    {
        label: 'Home',
        href: '/',
        icon: (active: boolean) => (
            <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2.1L1 12h3v9h6v-6h4v6h6v-9h3L12 2.1z" />
            </svg>
        ),
    },
    {
        label: 'Requests',
        href: '/requests',
        icon: (active: boolean) => (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
        ),
    },
    {
        label: 'Orders',
        href: '/orders',
        icon: (active: boolean) => (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
        ),
    },
    {
        label: 'Messages',
        href: '/messages',
        icon: (active: boolean) => (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
            </svg>
        ),
        badge: true,
    },
    {
        label: 'Notifications',
        href: '/notifications',
        icon: (active: boolean) => (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
        ),
        notifBadge: true,
    },
    {
        label: 'Profile',
        href: '/profile',
        icon: (active: boolean) => (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
            </svg>
        ),
    },
];

export default function DesktopSidebar() {
    const pathname = usePathname();
    const { status } = useSession();
    const { openGate } = useAuthGate();
    const [stores, setStores] = useState<StoreInfo[]>([]);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [unreadMessages, setUnreadMessages] = useState(0);
    const [unreadNotifs, setUnreadNotifs] = useState(0);

    useEffect(() => {
        if (status !== 'authenticated') return;
        fetch('/api/user/stores').then(r => r.json()).then(d => setStores(d.stores ?? [])).catch(() => {});
        fetch('/api/messages/unread-count').then(r => r.json()).then(d => setUnreadMessages(d.count ?? 0)).catch(() => {});
        fetch('/api/notifications/unread-count').then(r => r.json()).then(d => setUnreadNotifs(d.count ?? 0)).catch(() => {});
    }, [status]);

    const handleCreate = useCallback(() => {
        if (status === 'unauthenticated') {
            openGate('post a request or list a product', pathname ?? '/');
            return;
        }
        setSheetOpen(true);
    }, [status, openGate, pathname]);

    return (
        <>
            <aside className={styles.sidebar}>
                <div className={styles.inner}>
                    {/* Logo */}
                    <Link href="/" className={styles.logo}>
                        <Image src="/depmi-logo.svg" alt="DepMi" width={36} height={36} />
                        <span className={styles.logoText}>DepMi</span>
                    </Link>

                    {/* Nav items */}
                    <nav className={styles.nav}>
                        {NAV_ITEMS.map(item => {
                            const isActive = item.href === '/' ? pathname === '/' : pathname?.startsWith(item.href);
                            const badgeCount = item.badge ? unreadMessages : item.notifBadge ? unreadNotifs : 0;

                            if (item.label === 'Profile' && status === 'unauthenticated') {
                                return (
                                    <button
                                        key={item.label}
                                        className={`${styles.navItem} ${styles.navBtn}`}
                                        onClick={() => openGate('view your profile', pathname ?? '/')}
                                    >
                                        <span className={styles.navIcon}>{item.icon(false)}</span>
                                        <span className={styles.navLabel}>{item.label}</span>
                                    </button>
                                );
                            }

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                                >
                                    <span className={styles.navIcon}>
                                        {item.icon(!!isActive)}
                                        {badgeCount > 0 && <span className={styles.badge}>{badgeCount > 9 ? '9+' : badgeCount}</span>}
                                    </span>
                                    <span className={styles.navLabel}>{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Create button */}
                    <button className={styles.createBtn} onClick={handleCreate}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        <span className={styles.createBtnLabel}>Create</span>
                    </button>
                </div>
            </aside>

            {/* Create bottom sheet */}
            {sheetOpen && (
                <div className={styles.overlay} onClick={() => setSheetOpen(false)}>
                    <div className={styles.sheet} onClick={e => e.stopPropagation()}>
                        <div className={styles.sheetHandle} />
                        <p className={styles.sheetTitle}>What do you want to do?</p>
                        <Link href="/demand/new" className={styles.sheetOption} onClick={() => setSheetOpen(false)}>
                            <span className={styles.sheetIcon}>
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                            </span>
                            <div>
                                <p className={styles.sheetLabel}>Post a Request</p>
                                <p className={styles.sheetDesc}>Ask sellers to find what you need</p>
                            </div>
                        </Link>
                        <div className={styles.sheetDivider} />
                        <Link
                            href={stores.length > 0 ? `/store/${stores[0].slug}/products/new` : '/store/create'}
                            className={styles.sheetOption}
                            onClick={() => setSheetOpen(false)}
                        >
                            <span className={styles.sheetIcon}>
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
                            </span>
                            <div>
                                <p className={styles.sheetLabel}>{stores.length > 0 ? 'Add a Product' : 'Open a Store'}</p>
                                <p className={styles.sheetDesc}>{stores.length > 0 ? 'List a new item in your store' : 'Set up your store to start selling'}</p>
                            </div>
                        </Link>
                    </div>
                </div>
            )}
        </>
    );
}
