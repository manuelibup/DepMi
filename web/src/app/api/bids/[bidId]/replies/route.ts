import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NotificationType } from '@prisma/client';

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ bidId: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { bidId } = await params;
    const body = await req.json();
    const text = (body.text ?? '').trim();

    if (!text || text.length < 1) {
        return NextResponse.json({ message: 'Reply cannot be empty' }, { status: 400 });
    }
    if (text.length > 500) {
        return NextResponse.json({ message: 'Reply must be 500 characters or less' }, { status: 400 });
    }

    const { applyContentFilter } = await import('@/lib/contentFilter');
    const violation = await applyContentFilter(session.user.id, text);
    if (violation) return NextResponse.json({ message: violation }, { status: 403 });

    const bid = await (prisma.bid as any).findUnique({
        where: { id: bidId },
        include: {
            demand: { select: { id: true, userId: true } },
            store: { select: { owner: { select: { id: true, username: true } } } },
        },
    });
    if (!bid) {
        return NextResponse.json({ message: 'Bid not found' }, { status: 404 });
    }

    const comment = await prisma.comment.create({
        data: {
            text,
            authorId: session.user.id,
            bidId,
            demandId: bid.demand.id,
        },
        include: {
            author: { select: { displayName: true, username: true, avatarUrl: true } },
        },
    });

    // Notify the bid owner if they're not the one replying
    const bidOwnerId = bid.store.owner?.id;
    if (bidOwnerId && bidOwnerId !== session.user.id) {
        await prisma.notification.create({
            data: {
                userId: bidOwnerId,
                type: NotificationType.COMMENT_RECEIVED,
                title: 'Someone replied to your bid',
                body: `${comment.author.displayName}: ${text.slice(0, 80)}${text.length > 80 ? '…' : ''}`,
                link: `/requests/${bid.demand.id}`,
            },
        }).catch(() => {});
    }

    // Notify demand poster if they're not the replier and not already the bid owner
    const demandPosterId = bid.demand.userId;
    if (demandPosterId !== session.user.id && demandPosterId !== bidOwnerId) {
        await prisma.notification.create({
            data: {
                userId: demandPosterId,
                type: NotificationType.COMMENT_RECEIVED,
                title: 'New reply on a bid for your request',
                body: `${comment.author.displayName}: ${text.slice(0, 80)}${text.length > 80 ? '…' : ''}`,
                link: `/requests/${bid.demand.id}`,
            },
        }).catch(() => {});
    }

    return NextResponse.json({
        id: comment.id,
        text: comment.text,
        author: comment.author,
        createdAt: comment.createdAt.toISOString(),
    }, { status: 201 });
}
