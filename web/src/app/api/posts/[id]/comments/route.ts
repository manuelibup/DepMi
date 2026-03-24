import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const schema = z.object({ text: z.string().min(1).max(500) });

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id: postId } = await params;
    const comments = await prisma.postComment.findMany({
        where: { postId },
        orderBy: { createdAt: 'asc' },
        take: 50,
        include: { author: { select: { displayName: true, username: true, avatarUrl: true } } },
    });
    return NextResponse.json(comments.map(c => ({
        id: c.id,
        text: c.text,
        createdAt: c.createdAt.toISOString(),
        author: c.author,
    })));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: postId } = await params;
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

    const { applyContentFilter } = await import('@/lib/contentFilter');
    const violation = await applyContentFilter(session.user.id, parsed.data.text);
    if (violation) return NextResponse.json({ error: violation }, { status: 403 });

    const [comment] = await prisma.$transaction([
        prisma.postComment.create({
            data: { postId, authorId: session.user.id, text: parsed.data.text },
            include: { author: { select: { displayName: true, username: true, avatarUrl: true } } },
        }),
        prisma.post.update({ where: { id: postId }, data: { commentCount: { increment: 1 } } }),
    ]);

    return NextResponse.json({
        id: comment.id,
        text: comment.text,
        createdAt: comment.createdAt.toISOString(),
        author: comment.author,
    }, { status: 201 });
}
