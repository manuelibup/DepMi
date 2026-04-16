import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NotificationType } from '@prisma/client';

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id: demandId } = await params;

    /* Temporary bypass: Let UNVERIFIED users comment
    const commenter = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { kycTier: true }
    });
    if (!commenter || commenter.kycTier === 'UNVERIFIED') {
        return NextResponse.json({
            message: 'You need to verify your account before commenting. Go to Settings → Verify Account.',
            code: 'KYC_REQUIRED',
        }, { status: 403 });
    }
    */

    const body = await req.json();
    const text = (body.text ?? '').trim();
    const images = (body.images && Array.isArray(body.images) ? body.images : []).slice(0, 4);
    const videoUrl = body.videoUrl ?? null;

    if (!text || text.length < 1) {
        return NextResponse.json({ message: 'Comment cannot be empty' }, { status: 400 });
    }
    if (text.length > 500) {
        return NextResponse.json({ message: 'Comment must be 500 characters or less' }, { status: 400 });
    }

    const { applyContentFilter } = await import('@/lib/contentFilter');
    const violation = await applyContentFilter(session.user.id, text);
    if (violation) return NextResponse.json({ message: violation }, { status: 403 });

    const demand = await prisma.demand.findUnique({
        where: { id: demandId },
        select: { id: true, userId: true, isActive: true }
    });
    if (!demand) {
        return NextResponse.json({ message: 'Demand not found' }, { status: 404 });
    }

    const comment = await prisma.comment.create({
        data: {
            text,
            authorId: session.user.id,
            demandId,
            images,
            videoUrl,
        },
        include: {
            author: { select: { displayName: true, username: true, avatarUrl: true } }
        }
    });

    // Notify demand poster if they're not the commenter
    if (demand.userId !== session.user.id) {
        await prisma.notification.create({
            data: {
                userId: demand.userId,
                type: NotificationType.COMMENT_RECEIVED,
                title: 'New comment on your request',
                body: `${comment.author.displayName}: ${text.slice(0, 80)}${text.length > 80 ? '…' : ''}`,
                link: `/requests/${demandId}`,
            }
        }).catch(() => { }); // fire-and-forget
    }

    // If the commenter IS the poster, notify all unique bidders (store owners)
    if (demand.userId === session.user.id) {
        const bids = await prisma.bid.findMany({
            where: { demandId },
            include: { store: { select: { owner: { select: { id: true } } } } }
        });
        const bidderIds = [...new Set(bids.map((b: any) => b.store.owner.id).filter((id: string) => id !== session.user.id))];
        if (bidderIds.length > 0) {
            await prisma.notification.createMany({
                data: bidderIds.map((uid: string) => ({
                    userId: uid,
                    type: NotificationType.COMMENT_RECEIVED,
                    title: 'Reply on a request you bid on',
                    body: `${comment.author.displayName}: ${text.slice(0, 80)}${text.length > 80 ? '…' : ''}`,
                    link: `/requests/${demandId}#discussion`,
                })),
                skipDuplicates: true,
            }).catch(() => { });
        }
    }

    // Extract @mentions and notify users
    const mentions = Array.from(new Set<string>(text.match(/@([a-zA-Z0-9_]+)/g)?.map((m: string) => m.substring(1)) || []));
    if (mentions.length > 0) {
        const mentionedUsers = await prisma.user.findMany({
            where: { username: { in: mentions } },
            select: { id: true }
        });

        const notifyData = mentionedUsers
            .filter(u => u.id !== session.user.id && u.id !== demand.userId) // Poster already notified above
            .map(u => ({
                userId: u.id,
                type: NotificationType.MENTION,
                title: `${comment.author.displayName} mentioned you`,
                body: `${text.slice(0, 80)}${text.length > 80 ? '…' : ''}`,
                link: `/requests/${demandId}`,
            }));

        if (notifyData.length > 0) {
            await prisma.notification.createMany({
                data: notifyData
            }).catch(() => { });
        }
    }

    return NextResponse.json({
        id: comment.id,
        text: comment.text,
        images: comment.images,
        videoUrl: comment.videoUrl,
        author: comment.author,
        createdAt: comment.createdAt.toISOString(),
    }, { status: 201 });
}
