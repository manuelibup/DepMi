import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    const check = requireAdmin(session, 'ADMIN');
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

    const q = req.nextUrl.searchParams.get('q') ?? '';
    const page = Math.max(1, Number(req.nextUrl.searchParams.get('page') ?? '1'));
    const pageSize = 20;

    const where = q
        ? { OR: [
            { displayName: { contains: q, mode: 'insensitive' as const } },
            { email: { contains: q, mode: 'insensitive' as const } },
            { username: { contains: q, mode: 'insensitive' as const } },
          ] }
        : {};

    const [users, total] = await Promise.all([
        prisma.user.findMany({
            where,
            skip: (page - 1) * pageSize,
            take: pageSize,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true, displayName: true, email: true, username: true,
                avatarUrl: true, depCount: true, depTier: true, kycTier: true,
                adminRole: true, isBanned: true, createdAt: true, lastActiveAt: true,
                _count: { select: { followers: true, stores: true, ordersAsBuyer: true } },
            },
        }),
        prisma.user.count({ where }),
    ]);

    return NextResponse.json({
        users: users.map(u => ({ ...u, createdAt: u.createdAt.toISOString(), lastActiveAt: u.lastActiveAt?.toISOString() ?? null })),
        total, page, pageSize,
    });
}
