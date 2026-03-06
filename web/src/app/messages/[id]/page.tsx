import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import ChatClient from './ChatClient';

export default async function MessageThreadPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect('/login');
    }

    const { id } = await params;

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

    // Mark unread messages from other user as read
    const unreadIds = messages.filter(m => !m.read && m.senderId !== session.user.id).map(m => m.id);
    if (unreadIds.length > 0) {
        await prisma.message.updateMany({
            where: { id: { in: unreadIds } },
            data: { read: true }
        });
    }

    return (
        <ChatClient 
            conversationId={id} 
            initialMessages={messages} 
            otherUser={otherUser} 
            currentUserId={session.user.id} 
        />
    );
}
