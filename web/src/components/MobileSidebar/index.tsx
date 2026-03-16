'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import styles from './MobileSidebar.module.css';

interface Stats {
    users: number;
    stores: number;
    listings: number;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    unreadNotifs: number;
    unreadMessages: number;
}

const NAV_ITEMS = [
    {
        href: '/',
        label: 'Home',
        exact: true,
        icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.1L1 12h3v9h6v-6h4v6h6v-9h3L12 2.1z" /></svg>,
    },
    {
        href: '/requests',
        label: 'Requests',
        icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>,
    },
    {
        href: '/orders',
        label: 'Orders',
        icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" x2="21" y1="6" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>,
    },
    {
        href: '/search',
        label: 'Search',
        icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>,
    },
    {
        href: '/messages',
        label: 'Messages',
        badge: 'messages',
        icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" /></svg>,
    },
    {
        href: '/notifications',
        label: 'Notifications',
        badge: 'notifs',
        icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>,
    },
    {
        href: '/bookmarks',
        label: 'Bookmarks',
        icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>,
    },
    {
        href: '/profile',
        label: 'Profile',
        icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
    },
    {
        href: '/settings',
        label: 'Settings',
        icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>,
    },
    {
        href: '/support',
        label: 'Help & Support',
        icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
    },
];

function fmt(n: number) {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return String(n);
}

export default function MobileSidebar({ isOpen, onClose, unreadNotifs, unreadMessages }: Props) {
    const pathname = usePathname();
    const { data: session } = useSession();
    const [stats, setStats] = useState<Stats | null>(null);

    useEffect(() => {
        if (!isOpen || stats) return;
        fetch('/api/stats')
            .then(r => r.json())
            .then(setStats)
            .catch(() => { });
    }, [isOpen, stats]);

    // Lock body scroll when open
    useEffect(() => {
        document.body.style.overflow = isOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    const isActive = (href: string, exact?: boolean) =>
        exact ? pathname === href : pathname?.startsWith(href);

    return (
        <>
            {/* Backdrop */}
            <div
                className={`${styles.backdrop} ${isOpen ? styles.backdropVisible : ''}`}
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Drawer */}
            <aside className={`${styles.drawer} ${isOpen ? styles.drawerOpen : ''}`} aria-label="Navigation menu">
                {/* Close button */}
                <button className={styles.closeBtn} onClick={onClose} aria-label="Close menu">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>

                {/* User profile section */}
                {session?.user ? (
                    <div className={styles.profileSection}>
                        <div className={styles.profileAvatar}>
                            {session.user.image ? (
                                <Image src={session.user.image} alt="avatar" width={44} height={44} className={styles.avatarImg} />
                            ) : (
                                <span className={styles.avatarInitial}>
                                    {(session.user.name || session.user.email || '?').charAt(0).toUpperCase()}
                                </span>
                            )}
                        </div>
                        <div className={styles.profileInfo}>
                            <p className={styles.profileName}>{session.user.name}</p>
                            {session.user.username && (
                                <p className={styles.profileHandle}>@{session.user.username}</p>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className={styles.profileSection}>
                        <div className={styles.profileAvatar}>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                        </div>
                        <p className={styles.profileName} style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Not signed in</p>
                    </div>
                )}

                {/* Stats */}
                {stats && (
                    <div className={styles.statsRow}>
                        <div className={styles.statItem}>
                            <span className={styles.statNum}>{fmt(stats.users)}</span>
                            <span className={styles.statLbl}>Members</span>
                        </div>
                        <div className={styles.statDivider} />
                        <div className={styles.statItem}>
                            <span className={styles.statNum}>{fmt(stats.stores)}</span>
                            <span className={styles.statLbl}>Stores</span>
                        </div>
                        <div className={styles.statDivider} />
                        <div className={styles.statItem}>
                            <span className={styles.statNum}>{fmt(stats.listings)}</span>
                            <span className={styles.statLbl}>Listings</span>
                        </div>
                    </div>
                )}

                <div className={styles.divider} />

                {/* Navigation */}
                <nav className={styles.nav}>
                    {NAV_ITEMS.map(item => {
                        const active = isActive(item.href, item.exact);
                        const badge = item.badge === 'notifs' ? unreadNotifs
                            : item.badge === 'messages' ? unreadMessages
                            : 0;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={onClose}
                                className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}
                            >
                                <span className={styles.navIcon}>{item.icon}</span>
                                <span className={styles.navLabel}>{item.label}</span>
                                {badge > 0 && (
                                    <span className={styles.badge}>{badge > 9 ? '9+' : badge}</span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                <div className={styles.divider} />

                {/* Sign out */}
                {session?.user && (
                    <button
                        className={styles.signOutBtn}
                        onClick={() => { signOut(); onClose(); }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        Sign out
                    </button>
                )}

                <p className={styles.footer}>
                    <Link href="/about" onClick={onClose}>About</Link>
                    {' · '}
                    <Link href="/terms" onClick={onClose}>Terms</Link>
                    {' · '}
                    <Link href="/privacy" onClick={onClose}>Privacy</Link>
                </p>
            </aside>
        </>
    );
}
