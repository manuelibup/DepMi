import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    
    // Security check
    const conv = await prisma.conversation.findUnique({
        where: { id },
        select: { id: true, participants: { select: { id: true } } }
    });

    if (!conv || !conv.participants.some(p => p.id === session.user.id)) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const searchParams = req.nextUrl.searchParams;
    const since = searchParams.get('since');

    const messages = await prisma.message.findMany({
        where: {
            conversationId: id,
            ...(since && { createdAt: { gt: new Date(since) } })
        },
        orderBy: { createdAt: 'asc' }
    });

    // Mark fetched as read
    if (messages.length > 0) {
        const unreadIds = messages.filter(m => !m.read && m.senderId !== session.user.id).map(m => m.id);
        if (unreadIds.length > 0) {
            await prisma.message.updateMany({
                where: { id: { in: unreadIds } },
                data: { read: true }
            });
        }
    }

    return NextResponse.json(messages);
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const text = body.text?.trim() || null;
    const type = body.type || 'TEXT';
    const mediaUrl = body.mediaUrl || null;

    if (!text && !mediaUrl) {
        return NextResponse.json({ message: 'Message content required' }, { status: 400 });
    }

    // Security check
    const conv = await prisma.conversation.findUnique({
        where: { id },
        select: { id: true, participants: { select: { id: true } } }
    });

    if (!conv || !conv.participants.some(p => p.id === session.user.id)) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const message = await prisma.message.create({
        data: {
            conversationId: id,
            senderId: session.user.id,
            text,
            type,
            mediaUrl
        }
    });

    // Determine preview text
    let preview = text || '';
    if (type === 'IMAGE') preview = '📷 Photo';
    if (type === 'AUDIO') preview = '🎤 Voice message';
    if (type === 'STICKER') preview = '✨ Sticker';

    // Update conversation sorting and preview
    await prisma.conversation.update({
        where: { id },
        data: {
            lastMessageAt: message.createdAt,
            lastMessagePreview: preview.length > 50 ? preview.substring(0, 50) + '...' : preview
        }
    });

    return NextResponse.json(message, { status: 201 });
}
