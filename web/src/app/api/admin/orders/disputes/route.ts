import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';

export async function GET() {
    const session = await getServerSession(authOptions);
    const check = requireAdmin(session, 'MODERATOR');
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

    const disputes = await prisma.order.findMany({
        where: { status: 'DISPUTED' },
        orderBy: { updatedAt: 'desc' },
        select: {
            id: true,
            totalAmount: true,
            createdAt: true,
            updatedAt: true,
            buyer: { select: { id: true, displayName: true, email: true, avatarUrl: true } },
            seller: { select: { id: true, name: true, slug: true, logoUrl: true } },
            items: {
                take: 1,
                select: { product: { select: { title: true } } },
            },
        },
    });

    return NextResponse.json(disputes.map(d => ({
        ...d,
        totalAmount: Number(d.totalAmount),
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
    })));
}
