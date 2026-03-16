'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useScrollDirection } from '@/hooks/useScrollDirection';
import MobileSidebar from '@/components/MobileSidebar';
import styles from './Header.module.css';

export default function Header() {
    const isVisible = useScrollDirection();
    const [unreadNotifs, setUnreadNotifs] = useState(0);
    const [unreadMessages, setUnreadMessages] = useState(0);
    const [sidebarOpen, setSidebarOpen] = useState(false);

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

    const totalUnread = unreadNotifs + unreadMessages;

    return (
        <>
            <header className={`${styles.header} ${!isVisible ? styles.headerHidden : ''}`}>
                <Link href="/" className={styles.logoWrap}>
                    <Image src="/depmi-logo.svg" alt="DepMi logo" width={48} height={48} className={styles.logoMark} />
                    <span className={styles.logoText}>DepMi</span>
                </Link>

                {/* Hamburger button */}
                <button
                    className={styles.hamburger}
                    onClick={() => setSidebarOpen(true)}
                    aria-label="Open menu"
                >
                    {totalUnread > 0 && <span className={styles.hamburgerDot} />}
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="3" y1="6" x2="21" y2="6" />
                        <line x1="3" y1="12" x2="21" y2="12" />
                        <line x1="3" y1="18" x2="21" y2="18" />
                    </svg>
                </button>
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
