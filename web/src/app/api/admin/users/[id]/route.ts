import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    const check = requireAdmin(session, 'MODERATOR');
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

    const { id } = await params;

    const user = await prisma.user.findUnique({
        where: { id },
        select: {
            id: true, displayName: true, email: true, username: true, phoneNumber: true,
            avatarUrl: true, coverUrl: true, bio: true, depCount: true, depTier: true,
            kycTier: true, adminRole: true, isBanned: true, createdAt: true, lastActiveAt: true,
            _count: { select: { followers: true, following: true, ordersAsBuyer: true } },
            stores: {
                select: {
                    id: true, name: true, slug: true, verificationStatus: true, isActive: true,
                    depCount: true, rating: true, reviewCount: true,
                    _count: { select: { products: true, ordersAsSeller: true } },
                },
            },
            ordersAsBuyer: {
                orderBy: { createdAt: 'desc' },
                take: 10,
                select: {
                    id: true, totalAmount: true, status: true, createdAt: true,
                    seller: { select: { name: true } },
                },
            },
            posts: {
                orderBy: { createdAt: 'desc' },
                take: 5,
                select: { id: true, body: true, likeCount: true, commentCount: true, createdAt: true },
            },
            depTransactions: {
                orderBy: { createdAt: 'desc' },
                take: 10,
                select: { id: true, amount: true, reason: true, createdAt: true },
            },
        },
    });

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json({
        ...user,
        createdAt: user.createdAt.toISOString(),
        lastActiveAt: user.lastActiveAt?.toISOString() ?? null,
        ordersAsBuyer: user.ordersAsBuyer.map(o => ({
            ...o, totalAmount: Number(o.totalAmount), createdAt: o.createdAt.toISOString(),
        })),
        posts: user.posts.map(p => ({ ...p, createdAt: p.createdAt.toISOString() })),
        depTransactions: user.depTransactions.map(t => ({ ...t, createdAt: t.createdAt.toISOString() })),
    });
}
