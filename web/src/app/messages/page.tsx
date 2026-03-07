import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import EmptyState from '@/components/EmptyState';
import styles from './page.module.css';

function timeShort(date: Date) {
    const diff = Date.now() - date.getTime();
    const d = new Date(date);
    const isToday = d.toDateString() === new Date().toDateString();
    
    if (isToday) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    const isYesterday = new Date(Date.now() - 86400000).toDateString() === d.toDateString();
    if (isYesterday) return 'Yesterday';
    
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default async function MessagesInboxPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect('/login?callbackUrl=/messages');
    }

    const conversations = await prisma.conversation.findMany({
        where: {
            participants: {
                some: { id: session.user.id }
            }
        },
        include: {
            participants: {
                where: { id: { not: session.user.id } },
                select: { id: true, displayName: true, avatarUrl: true, username: true }
            },
            messages: { // Just to check if there are unread messages to this user
                where: { 
                    senderId: { not: session.user.id },
                    read: false 
                },
                take: 1
            }
        },
        orderBy: { lastMessageAt: 'desc' }
    });

    return (
        <main className={styles.container}>
            <Header />
            
            <div className={styles.titleRow}>
                <h1 className={styles.title}>Messages</h1>
                
                <Link href="/search" className={styles.newChatBtn} title="New Message">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14l4-4h9a2 2 0 0 0 2-2v-5" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                </Link>
            </div>

            <div className={styles.content}>
                {conversations.length === 0 ? (
                    <div style={{ paddingTop: '40px' }}>
                        <EmptyState
                            title="No messages yet"
                            description="Reach out to vendors directly from their profiles or products, and your chats will appear here."
                        />
                    </div>
                ) : (
                    <div className={styles.convList}>
                        {conversations.map(conv => {
                            const otherUser = conv.participants[0];
                            if (!otherUser) return null; // Edge case if the other user was deleted
                            const hasUnread = conv.messages.length > 0;
                            
                            return (
                                <Link key={conv.id} href={`/messages/${conv.id}`} className={styles.convCard}>
                                    {otherUser.avatarUrl ? (
                                        <img src={otherUser.avatarUrl} alt="" className={styles.avatar} />
                                    ) : (
                                        <div className={styles.avatar}>
                                            {otherUser.displayName.substring(0, 2).toUpperCase()}
                                        </div>
                                    )}
                                    <div className={styles.details}>
                                        <div className={styles.topRow}>
                                            <h3 className={styles.name}>{otherUser.displayName}</h3>
                                            <span className={styles.time}>{timeShort(conv.lastMessageAt)}</span>
                                        </div>
                                        <p className={styles.preview} style={{ color: hasUnread ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: hasUnread ? '600' : 'normal' }}>
                                            {conv.lastMessagePreview || 'New Conversation'}
                                        </p>
                                    </div>
                                    {hasUnread && <div className={styles.unreadDot} />}
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
            <BottomNav />
        </main>
    );
}
