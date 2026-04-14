'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { useScrollDirection } from '@/hooks/useScrollDirection';
import MobileSidebar from '@/components/MobileSidebar';
import styles from './Header.module.css';

export default function Header() {
    const isVisible = useScrollDirection();
    const { status } = useSession();
    const [unreadNotifs, setUnreadNotifs] = useState(0);
    const [unreadMessages, setUnreadMessages] = useState(0);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        if (status !== 'authenticated') return;
        fetch('/api/notifications/unread-count')
            .then(r => r.json())
            .then(data => setUnreadNotifs(data.count ?? 0))
            .catch(() => { });

        fetch('/api/messages/unread-count')
            .then(r => r.json())
            .then(data => setUnreadMessages(data.count ?? 0))
            .catch(() => { });
    }, [status]);

    const handleNotifClick = useCallback(() => {
        setUnreadNotifs(0);
        fetch('/api/notifications/mark-read', { method: 'POST' }).catch(() => {});
    }, []);

    return (
        <>
            <header className={`${styles.header} ${!isVisible ? styles.headerHidden : ''}`}>
                <Link href="/" className={styles.logoWrap}>
                    <Image src="/depmi-wordmark.svg" alt="depmi" priority width={108} height={54} />
                </Link>

                <div className={styles.headerRight}>
                    {/* Notifications bell — mobile only */}
                    {status === 'authenticated' && (
                        <Link
                            href="/notifications"
                            className={styles.notifBtn}
                            onClick={handleNotifClick}
                            aria-label="Notifications"
                        >
                            {unreadNotifs > 0 && (
                                <span className={styles.notifBadge}>
                                    {unreadNotifs > 9 ? '9+' : unreadNotifs}
                                </span>
                            )}
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                            </svg>
                        </Link>
                    )}

                    {/* Hamburger button */}
                    <button
                        className={styles.hamburger}
                        onClick={() => setSidebarOpen(true)}
                        aria-label="Open menu"
                    >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <line x1="3" y1="6" x2="21" y2="6" />
                            <line x1="3" y1="12" x2="21" y2="12" />
                            <line x1="3" y1="18" x2="21" y2="18" />
                        </svg>
                    </button>
                </div>
            </header>

            <MobileSidebar
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                unreadNotifs={unreadNotifs}
                unreadMessages={unreadMessages}
            />
        </>
    );
}

