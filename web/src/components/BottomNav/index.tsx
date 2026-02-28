'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import styles from './BottomNav.module.css';

const NAV_ITEMS = [
    {
        label: 'Home',
        icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.1L1 12h3v9h6v-6h4v6h6v-9h3L12 2.1z" />
            </svg>
        ),
        href: '/',
    },
    {
        label: 'Discover',
        icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
            </svg>
        ),
        href: '/discover',
    },
    {
        label: 'Post',
        isAdd: true,
    },
    {
        label: 'Orders',
        icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
        ),
        href: '/orders',
    },
    {
        label: 'Profile',
        icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
            </svg>
        ),
        href: '/profile', // We'll map this to /login if unauthenticated
    },
];

export default function BottomNav() {
    const pathname = usePathname();
    const { status } = useSession();

    return (
        <nav className={styles.nav}>
            {NAV_ITEMS.map((item) => {
                if (item.isAdd) {
                    return (
                        <div key={item.label} className={styles.addWrap}>
                            <button className={styles.addBtn} aria-label="Create post">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                    <line x1="12" y1="5" x2="12" y2="19" />
                                    <line x1="5" y1="12" x2="19" y2="12" />
                                </svg>
                            </button>
                        </div>
                    );
                }

                // Determine target href
                let targetHref = item.href || '/';
                if (item.label === 'Profile' && status === 'unauthenticated') {
                    targetHref = '/login';
                }

                // Check active state
                // If it's the home icon ("/") only activate if exact match to prevent it staying lit
                const isActive = item.href
                    ? (item.href === '/' ? pathname === '/' : pathname?.startsWith(item.href))
                    : false;

                return (
                    <Link
                        key={item.label}
                        href={targetHref}
                        className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                    >
                        <span className={styles.navIcon}>{item.icon}</span>
                        <span className={styles.navLabel}>{item.label}</span>
                    </Link>
                );
            })}
        </nav>
    );
}
