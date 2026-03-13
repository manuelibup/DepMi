import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    const check = requireAdmin(session, 'ADMIN');
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

    const page = Math.max(1, Number(req.nextUrl.searchParams.get('page') ?? '1'));
    const pageSize = 20;

    const [codes, total] = await Promise.all([
        prisma.referralCode.findMany({
            skip: (page - 1) * pageSize,
            take: pageSize,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true, code: true, perUserEnabled: true, createdAt: true,
                user: { select: { id: true, displayName: true, email: true, avatarUrl: true } },
                _count: { select: { referrals: true } },
            },
        }),
        prisma.referralCode.count(),
    ]);

    return NextResponse.json({
        codes: codes.map(c => ({ ...c, createdAt: c.createdAt.toISOString() })),
        total, page, pageSize,
    });
}
