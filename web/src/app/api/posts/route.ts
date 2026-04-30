import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { PostType } from '@prisma/client';

const createSchema = z.object({
    body: z.string().min(1).max(2000),
    type: z.nativeEnum(PostType).default('POST'),
    images: z.array(z.string().url()).max(10).optional(),
});

// GET /api/posts?storeId=xxx&cursor=xxx  — paginated posts for a store
export async function GET(req: NextRequest) {
    const storeId = req.nextUrl.searchParams.get('storeId');
    const cursor = req.nextUrl.searchParams.get('cursor') ?? undefined;
    const limit = 15;

    if (!storeId) return NextResponse.json({ error: 'storeId required' }, { status: 400 });

    const session = await getServerSession(authOptions);

    const posts = await prisma.post.findMany({
        where: { storeId },
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        include: {
            author: { select: { displayName: true, username: true, avatarUrl: true } },
            images: { select: { url: true } },
            ...(session?.user?.id ? {
                likes: { where: { userId: session.user.id }, select: { id: true } }
            } : {}),
            _count: { select: { comments: true } },
        },
    });

    const hasMore = posts.length > limit;
    const page = hasMore ? posts.slice(0, limit) : posts;
    const nextCursor = hasMore ? page[page.length - 1].id : null;

    return NextResponse.json({
        posts: page.map(p => ({
            id: p.id,
            body: p.body,
            type: p.type,
            likeCount: p.likeCount,
            commentCount: p._count.comments,
            createdAt: p.createdAt.toISOString(),
            author: p.author,
            images: p.images,
            isLiked: session?.user?.id ? ((p as { likes?: { id: string }[] }).likes?.length ?? 0) > 0 : false,
        })),
        nextCursor,
    });
}

// POST /api/posts  — create a post (store owner only)
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

    const storeId: string | undefined = body.storeId;
    if (!storeId) return NextResponse.json({ error: 'storeId required' }, { status: 400 });

    // Verify the user owns this store
    const store = await prisma.store.findUnique({ where: { id: storeId }, select: { ownerId: true } });
    if (!store || store.ownerId !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { applyContentFilter, isAdminUser } = await import('@/lib/contentFilter');
    const immune = await isAdminUser(session.user.id);
    const violation = await applyContentFilter(session.user.id, parsed.data.body, immune);
    if (violation) return NextResponse.json({ error: violation }, { status: 403 });

    const post = await prisma.post.create({
        data: {
            storeId,
            authorId: session.user.id,
            body: parsed.data.body,
            type: parsed.data.type,
            images: parsed.data.images?.length
                ? { create: parsed.data.images.map(url => ({ url })) }
                : undefined,
        },
        include: {
            author: { select: { displayName: true, username: true, avatarUrl: true } },
            images: { select: { url: true } },
        },
    });

    return NextResponse.json({
        id: post.id,
        body: post.body,
        type: post.type,
        likeCount: 0,
        commentCount: 0,
        createdAt: post.createdAt.toISOString(),
        author: post.author,
        images: post.images,
        isLiked: false,
    }, { status: 201 });
}
