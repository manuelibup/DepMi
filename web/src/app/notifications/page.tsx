import React from 'react';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import EmptyState from '@/components/EmptyState';
import NotifPrefsForm from '@/components/NotifPrefsForm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { NotificationType } from '@prisma/client';
import styles from './page.module.css';

function timeAgo(date: Date) {
    const diff = Date.now() - date.getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 30) return `${d}d ago`;
    return date.toLocaleDateString();
}

function getIconForType(type: NotificationType) {
    switch (type) {
        case 'MENTION':
            return (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="4" />
                    <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8" />
                </svg>
            );
        case 'BID_RECEIVED':
            return (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2v20" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
            );
        case 'ORDER_CONFIRMED':
        case 'ORDER_SHIPPED':
        case 'ORDER_DELIVERED':
            return (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v3" />
                    <path d="M21 16v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3" />
                    <path d="M4 12h16" />
                </svg>
            );
        case 'NEW_PRODUCT_FROM_STORE':
            return (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <line x1="12" y1="8" x2="12" y2="16" />
                    <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
            );
        case 'NEW_DEMAND':
            return (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                    <line x1="11" y1="8" x2="11" y2="14" />
                    <line x1="8" y1="11" x2="14" y2="11" />
                </svg>
            );
        case 'ANNOUNCEMENT':
            return (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3z" />
                    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                </svg>
            );
        case 'COMMENT_RECEIVED':
            return (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </svg>
            );
        case 'STORE_FOLLOW_SALE':
            return (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
            );
        case 'SOCIAL_ACTIVITY':
            return (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
            );
        case 'SYSTEM':
        default:
            return (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
            );
    }
}

export default async function NotificationsPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect('/login?callbackUrl=/notifications');
    }

    const userId = session.user.id;

    const [notifications, userData] = await Promise.all([
        prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 50,
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (prisma.user as any).findUnique({
            where: { id: userId },
            select: {
                notifDemandCategories: true,
                stores: { select: { id: true }, take: 1 },
            },
        }),
    ]);

    if (notifications.some(n => !n.isRead)) {
        await prisma.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true },
        });
    }

    const ownsStore = (userData?.stores?.length ?? 0) > 0;
    const notifDemandCategories: string[] = userData?.notifDemandCategories ?? [];

    // Announcements float to the top
    const announcements = notifications.filter(n => n.type === 'ANNOUNCEMENT');
    const regular = notifications.filter(n => n.type !== 'ANNOUNCEMENT');
    const ordered = [...announcements, ...regular];

    return (
        <main className={styles.container}>
            <Header />
            <div className={styles.content}>
                <h1 className={styles.pageTitle}>Notifications</h1>

                {ordered.length === 0 ? (
                    <div style={{ paddingTop: '20px' }}>
                        <EmptyState
                            title="No new notifications"
                            description="You're all caught up! When you get updates about bids, orders, or mentions, they will appear here."
                        />
                    </div>
                ) : (
                    <div className={styles.list}>
                        {ordered.map(n => (
                            <Link
                                key={n.id}
                                href={n.link || '#'}
                                className={[
                                    styles.card,
                                    !n.isRead ? styles.unread : '',
                                    n.type === 'ANNOUNCEMENT' ? styles.announcement : '',
                                    n.type === 'STORE_FOLLOW_SALE' || n.type === 'SOCIAL_ACTIVITY' ? styles.socialCard : '',
                                ].filter(Boolean).join(' ')}
                            >
                                <div className={styles.iconBox}>
                                    {getIconForType(n.type)}
                                </div>
                                <div className={styles.details}>
                                    <h3 className={styles.notifTitle}>{n.title}</h3>
                                    <p className={styles.notifBody}>{n.body}</p>
                                    <span className={styles.notifTime}>{timeAgo(n.createdAt)}</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                {ownsStore && (
                    <NotifPrefsForm initial={notifDemandCategories} />
                )}
            </div>
            <BottomNav />
        </main>
    );
}
