import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';

import { unstable_cache } from 'next/cache';

const getCommerceStats = unstable_cache(
    async () => {
        const [gmvAgg, escrowAgg, feesAgg, orderGroups, recentDisputes] = await Promise.all([
            prisma.order.aggregate({
                _sum: { totalAmount: true },
                where: { status: 'COMPLETED' },
            }),
            prisma.order.aggregate({
                _sum: { totalAmount: true },
                where: { escrowStatus: 'HELD', status: { in: ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED'] } },
            }),
            prisma.order.aggregate({
                _sum: { platformFeeNgn: true },
                where: { status: 'COMPLETED' },
            }),
            prisma.order.groupBy({
                by: ['status'],
                _count: { id: true },
            }),
            prisma.order.findMany({
                where: { status: 'DISPUTED' },
                orderBy: { updatedAt: 'desc' },
                take: 20,
                select: {
                    id: true,
                    totalAmount: true,
                    createdAt: true,
                    updatedAt: true,
                    buyer: { select: { id: true, displayName: true, email: true } },
                    seller: { select: { id: true, name: true } },
                    items: { take: 1, select: { product: { select: { title: true } } } },
                },
            }),
        ]);
        return { gmvAgg, escrowAgg, feesAgg, orderGroups, recentDisputes };
    },
    ['admin-commerce-stats'],
    { revalidate: 1800 } // Cache for 30 minutes
);

export async function GET() {
    const session = await getServerSession(authOptions);
    const check = requireAdmin(session, 'MODERATOR');
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

    const { gmvAgg, escrowAgg, feesAgg, orderGroups, recentDisputes } = await getCommerceStats();

    const ordersByStatus = Object.fromEntries(
        orderGroups.map(g => [g.status, g._count.id])
    );

    return NextResponse.json({
        gmv: Number(gmvAgg._sum.totalAmount ?? 0),
        escrowBalance: Number(escrowAgg._sum.totalAmount ?? 0),
        platformFees: Number(feesAgg._sum.platformFeeNgn ?? 0),
        ordersByStatus,
        recentDisputes: recentDisputes.map(d => ({
            ...d,
            totalAmount: Number(d.totalAmount),
            createdAt: d.createdAt.toISOString(),
            updatedAt: d.updatedAt.toISOString(),
        })),
    });
}
