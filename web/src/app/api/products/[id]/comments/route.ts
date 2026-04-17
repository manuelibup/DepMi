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

    const { id: productId } = await params;

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

    const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { id: true, title: true, store: { select: { ownerId: true } } }
    });
    if (!product) {
        return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }

    const [comment] = await prisma.$transaction([
        prisma.comment.create({
            data: {
                text,
                authorId: session.user.id,
                productId,
                images,
                videoUrl,
            },
            include: {
                author: { select: { displayName: true, username: true, avatarUrl: true } }
            }
        }),
        prisma.product.update({
            where: { id: productId },
            data: { commentCount: { increment: 1 } }
        })
    ]);

    // Notify store owner if they're not the commenter
    const storeOwnerId = product.store.ownerId;
    if (storeOwnerId !== session.user.id) {
        await prisma.notification.create({
            data: {
                userId: storeOwnerId,
                type: NotificationType.COMMENT_RECEIVED,
                title: `New comment on ${product.title}`,
                body: `${comment.author.displayName}: ${text.slice(0, 80)}${text.length > 80 ? '…' : ''}`,
                link: `/p/${productId}`,
            }
        }).catch(() => { }); // fire-and-forget
    }

    // Extract @mentions and notify users
    const mentions = Array.from(new Set<string>(text.match(/@([a-zA-Z0-9_]+)/g)?.map((m: string) => m.substring(1)) || []));
    if (mentions.length > 0) {
        const mentionedUsers = await prisma.user.findMany({
            where: { username: { in: mentions } },
            select: { id: true }
        });

        const notifyData = mentionedUsers
            .filter(u => u.id !== session.user.id && u.id !== storeOwnerId) // Store owner already notified above
            .map(u => ({
                userId: u.id,
                type: NotificationType.MENTION,
                title: `${comment.author.displayName} mentioned you`,
                body: `${text.slice(0, 80)}${text.length > 80 ? '…' : ''}`,
                link: `/p/${productId}`,
            }));

        if (notifyData.length > 0) {
            await prisma.notification.createMany({
                data: notifyData
            }).catch(() => { });
        }
    }

    // Extract product links [product:<id>] and notify those store owners
    const productLinks = Array.from(new Set<string>(text.match(/\[product:([a-zA-Z0-9_\-]+)\]/g)?.map((m: string) => m.substring(9, m.length - 1)) || []));
    if (productLinks.length > 0) {
        const linkedProducts = await prisma.product.findMany({
            where: { id: { in: productLinks } },
            select: { title: true, store: { select: { ownerId: true } } }
        });

        const notifyData = linkedProducts
            .filter(p => p.store.ownerId !== session.user.id && p.store.ownerId !== storeOwnerId) // Don't notify the commenter or the owner of the current product if they are the same
            .map(p => ({
                userId: p.store.ownerId,
                type: NotificationType.MENTION,
                title: `${comment.author.displayName} linked your product`,
                body: `Your product '${p.title}' was mentioned in a comment.`,
                link: `/p/${productId}`,
            }));

        // Filter out duplicate owners if multiple products from the same owner were linked
        const uniqueNotifyData = notifyData.filter((v, i, a) => a.findIndex(t => (t.userId === v.userId)) === i);

        if (uniqueNotifyData.length > 0) {
            await prisma.notification.createMany({
                data: uniqueNotifyData
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
