'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useScrollDirection } from '@/hooks/useScrollDirection';
import styles from './Header.module.css';

export default function Header() {
    const isVisible = useScrollDirection();
    const [unreadNotifs, setUnreadNotifs] = useState(0);
    const [unreadMessages, setUnreadMessages] = useState(0);

    useEffect(() => {
        fetch('/api/notifications/unread-count')
            .then(r => r.json())
            .then(data => setUnreadNotifs(data.count ?? 0))
            .catch(() => { });

        fetch('/api/messages/unread-count')
            .then(r => r.json())
            .then(data => setUnreadMessages(data.count ?? 0))
            .catch(() => { });
    }, []);

    return (
        <header className={`${styles.header} ${!isVisible ? styles.headerHidden : ''}`}>
            <Link href="/" className={styles.logoWrap}>
                <Image src="/depmi-logo.svg" alt="DepMi logo" width={48} height={48} className={styles.logoMark} />
                <span className={styles.logoText}>DepMi</span>
            </Link>
            <div className={styles.headerActions}>
                <Link href="/search" className={styles.iconBtn} aria-label="Search">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                </Link>
                <Link href="/messages" className={styles.iconBtn} aria-label="Messages">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
                    </svg>
                    {unreadMessages > 0 && <span className={styles.notifDot} />}
                </Link>
                <Link href="/notifications" className={styles.iconBtn} aria-label="Notifications">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                    {unreadNotifs > 0 && <span className={styles.notifDot} />}
                </Link>
            </div>
        </header>
    );
}
