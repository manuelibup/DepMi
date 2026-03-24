import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireAdmin } from '@/lib/admin';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import MessagesTable from './MessagesTable';
import styles from './page.module.css';

export default async function AdminMessagesPage() {
    const session = await getServerSession(authOptions);
    const check = requireAdmin(session, 'ADMIN');
    if (!check.ok) redirect('/');

    const conversations = await (prisma.conversation as any).findMany({
        orderBy: { lastMessageAt: 'desc' },
        take: 50,
        select: {
            id: true,
            lastMessagePreview: true,
            lastMessageAt: true,
            participants: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
            _count: { select: { messages: true } },
            messages: {
                orderBy: { createdAt: 'desc' },
                take: 20,
                select: {
                    id: true,
                    text: true,
                    type: true,
                    mediaUrl: true,
                    createdAt: true,
                    read: true,
                    sender: { select: { id: true, username: true, displayName: true } },
                },
            },
        },
    });

    const total = await (prisma.conversation as any).count();

    const serialized = conversations.map((c: any) => ({
        ...c,
        lastMessageAt: c.lastMessageAt?.toISOString() ?? null,
        messages: c.messages.map((m: any) => ({
            ...m,
            createdAt: m.createdAt.toISOString(),
        })),
    }));

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <h1 className={styles.pageTitle}>Messages</h1>
                <span className={styles.totalBadge}>{total} conversations</span>
            </div>
            <p className={styles.notice}>
                Read-only view of all DMs on DepMi. You can delete individual messages that violate platform rules.
            </p>
            <MessagesTable conversations={serialized} />
        </div>
    );
}
