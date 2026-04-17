import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/users/follow   — follow a user
// DELETE /api/users/follow — unfollow a user
// body: { targetUserId: string }

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { targetUserId } = await req.json();
    if (!targetUserId || targetUserId === session.user.id) {
        return NextResponse.json({ error: 'Invalid target' }, { status: 400 });
    }

    const existing = await prisma.userFollow.findUnique({
        where: { followerId_followingId: { followerId: session.user.id, followingId: targetUserId } },
    });

    if (!existing) {
        await prisma.$transaction([
            prisma.userFollow.create({
                data: { followerId: session.user.id, followingId: targetUserId },
            }),
            prisma.user.update({
                where: { id: targetUserId },
                data: { followerCount: { increment: 1 } },
            })
        ]);

        // Notify the followed user
        const follower = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { displayName: true, username: true },
        });
        const name = follower?.displayName ?? follower?.username ?? 'Someone';
        const link = follower?.username ? `/${follower.username}` : null;

        await prisma.notification.create({
            data: {
                userId: targetUserId,
                type: 'NEW_FOLLOWER',
                title: 'New follower',
                body: `${name} started following you`,
                ...(link && { link }),
            },
        });
    }

    return NextResponse.json({ following: true });
}

export async function DELETE(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { targetUserId } = await req.json();
    if (!targetUserId) return NextResponse.json({ error: 'Invalid target' }, { status: 400 });

    const existing = await prisma.userFollow.findUnique({
        where: { followerId_followingId: { followerId: session.user.id, followingId: targetUserId } },
    });

    if (existing) {
        await prisma.$transaction([
            prisma.userFollow.delete({
                where: { id: existing.id },
            }),
            prisma.user.update({
                where: { id: targetUserId },
                data: { followerCount: { decrement: 1 } },
            })
        ]);
    }

    return NextResponse.json({ following: false });
}
