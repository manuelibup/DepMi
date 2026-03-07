import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import ChatClient from './ChatClient';
import Header from '@/components/Header';

export default async function MessageThreadPage({ 
    params, 
    searchParams 
}: { 
    params: Promise<{ id: string }>, 
    searchParams?: Promise<{ text?: string }> 
}) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect('/login');
    }

    const { id } = await params;
    const resolvedSearchParams = await searchParams;
    const initialText = resolvedSearchParams?.text || '';

    const conversation = await prisma.conversation.findUnique({
        where: { id },
        include: {
            participants: {
                select: { id: true, displayName: true, username: true, avatarUrl: true }
            }
        }
    });

    if (!conversation) {
        redirect('/messages');
    }

    // Security check
    if (!conversation.participants.some(p => p.id === session.user.id)) {
        redirect('/messages');
    }

    const otherUser = conversation.participants.find(p => p.id !== session.user.id)!;

    // Fetch initial messages
    const messages = await prisma.message.findMany({
        where: { conversationId: id },
        orderBy: { createdAt: 'asc' },
        take: 100 // To do: pagination for huge chats
    });

    // Serialize Prisma objects (strip non-plain symbol properties) before passing to Client Component
    const plainMessages = messages.map(m => ({
        id: m.id,
        conversationId: m.conversationId,
        senderId: m.senderId,
        text: m.text,
        type: m.type,
        mediaUrl: m.mediaUrl,
        read: m.read,
        createdAt: m.createdAt.toISOString(),
    }));

    const plainOtherUser = {
        id: otherUser.id,
        displayName: otherUser.displayName,
        username: otherUser.username,
        avatarUrl: otherUser.avatarUrl,
    };

    // Mark unread messages from other user as read
    const unreadIds = messages.filter(m => !m.read && m.senderId !== session.user.id).map(m => m.id);
    if (unreadIds.length > 0) {
        await prisma.message.updateMany({
            where: { id: { in: unreadIds } },
            data: { read: true }
        });
    }

    return (
        <main style={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>
            <ChatClient
                conversationId={id}
                initialMessages={plainMessages}
                otherUser={plainOtherUser}
                currentUserId={session.user.id}
                initialText={initialText}
            />
        </main>
    );
}
