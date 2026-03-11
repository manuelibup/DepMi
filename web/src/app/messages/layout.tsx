import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import styles from './MessagesLayout.module.css';

function timeShort(date: Date) {
    const d = new Date(date);
    const isToday = d.toDateString() === new Date().toDateString();
    if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isYesterday = new Date(Date.now() - 86400000).toDateString() === d.toDateString();
    if (isYesterday) return 'Yesterday';
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default async function MessagesLayout({ children }: { children: React.ReactNode }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) redirect('/login?callbackUrl=/messages');

    const conversations = await prisma.conversation.findMany({
        where: { participants: { some: { id: session.user.id } } },
        include: {
            participants: {
                where: { id: { not: session.user.id } },
                select: { id: true, displayName: true, avatarUrl: true, username: true }
            },
            messages: {
                where: { senderId: { not: session.user.id }, read: false },
                take: 1
            }
        },
        orderBy: { lastMessageAt: 'desc' }
    });

    return (
        <div className={styles.shell}>
            {/* Left panel: conversation list — desktop only */}
            <aside className={styles.leftPanel}>
                <div className={styles.panelHeader}>
                    <h1 className={styles.panelTitle}>Messages</h1>
                    <Link href="/search" className={styles.newChatBtn} title="New Message">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14l4-4h9a2 2 0 0 0 2-2v-5" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                    </Link>
                </div>

                <div className={styles.convList}>
                    {conversations.map(conv => {
                        const otherUser = conv.participants[0];
                        if (!otherUser) return null;
                        const hasUnread = conv.messages.length > 0;

                        return (
                            <Link key={conv.id} href={`/messages/${conv.id}`} className={styles.convItem}>
                                {otherUser.avatarUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={otherUser.avatarUrl} alt="" className={styles.avatar} />
                                ) : (
                                    <div className={styles.avatar}>
                                        {(otherUser.displayName || otherUser.username || '?').substring(0, 2).toUpperCase()}
                                    </div>
                                )}
                                <div className={styles.details}>
                                    <div className={styles.topRow}>
                                        <h3 className={styles.convName}>{otherUser.displayName}</h3>
                                        <span className={styles.convTime}>{timeShort(conv.lastMessageAt)}</span>
                                    </div>
                                    <p className={styles.convPreview} style={{
                                        fontWeight: hasUnread ? 700 : 400,
                                        color: hasUnread ? 'var(--text-main)' : 'var(--text-muted)'
                                    }}>
                                        {conv.lastMessagePreview || 'New Conversation'}
                                    </p>
                                </div>
                                {hasUnread && <div className={styles.unreadDot} />}
                            </Link>
                        );
                    })}
                </div>
            </aside>

            {/* Right panel: active chat or empty state */}
            <div className={styles.rightPanel}>
                {children}
            </div>
        </div>
    );
}
