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

    await prisma.userFollow.upsert({
        where: { followerId_followingId: { followerId: session.user.id, followingId: targetUserId } },
        create: { followerId: session.user.id, followingId: targetUserId },
        update: {},
    });

    return NextResponse.json({ following: true });
}

export async function DELETE(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { targetUserId } = await req.json();
    if (!targetUserId) return NextResponse.json({ error: 'Invalid target' }, { status: 400 });

    await prisma.userFollow.deleteMany({
        where: { followerId: session.user.id, followingId: targetUserId },
    });

    return NextResponse.json({ following: false });
}
