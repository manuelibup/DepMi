import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: postId } = await params;

    const existing = await prisma.postLike.findUnique({
        where: { postId_userId: { postId, userId: session.user.id } },
    });

    if (existing) {
        await prisma.$transaction([
            prisma.postLike.delete({ where: { id: existing.id } }),
            prisma.post.update({ where: { id: postId }, data: { likeCount: { decrement: 1 } } }),
        ]);
        return NextResponse.json({ liked: false });
    }

    await prisma.$transaction([
        prisma.postLike.create({ data: { postId, userId: session.user.id } }),
        prisma.post.update({ where: { id: postId }, data: { likeCount: { increment: 1 } } }),
    ]);
    return NextResponse.json({ liked: true });
}
