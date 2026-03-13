import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    const check = requireAdmin(session, 'MODERATOR');
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

    const period = req.nextUrl.searchParams.get('period') ?? 'all';
    const since = period === '7d'
        ? new Date(Date.now() - 7 * 86400 * 1000)
        : period === '30d'
        ? new Date(Date.now() - 30 * 86400 * 1000)
        : undefined;

    const dateFilter = since ? { createdAt: { gte: since } } : {};

    const [posts, demands, comments, postLikes, demandLikes, productLikes, bookmarks, topPosts, topDemands] =
        await Promise.all([
            prisma.post.count({ where: dateFilter }),
            prisma.demand.count({ where: dateFilter }),
            prisma.comment.count({ where: dateFilter }),
            prisma.postLike.count({ where: dateFilter }),
            prisma.demandLike.count({ where: dateFilter }),
            prisma.productLike.count({ where: dateFilter }),
            prisma.savedProduct.count({ where: dateFilter }),
            prisma.post.findMany({
                orderBy: { likeCount: 'desc' },
                take: 5,
                select: { id: true, body: true, likeCount: true, commentCount: true, createdAt: true, store: { select: { name: true } } },
            }),
            prisma.demand.findMany({
                orderBy: { viewCount: 'desc' },
                take: 5,
                select: { id: true, text: true, viewCount: true, createdAt: true, user: { select: { displayName: true } } },
            }),
        ]);

    return NextResponse.json({
        posts, demands, comments,
        likes: postLikes + demandLikes + productLikes,
        bookmarks,
        topPosts: topPosts.map(p => ({ ...p, createdAt: p.createdAt.toISOString() })),
        topDemands: topDemands.map(d => ({ ...d, createdAt: d.createdAt.toISOString() })),
    });
}
