import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';

import { unstable_cache } from 'next/cache';

const getOverviewStats = unstable_cache(
    async () => {
        const [users, stores, products, posts, demands, activeOrders, disputedOrders] =
            await Promise.all([
                prisma.user.count(),
                prisma.store.count(),
                prisma.product.count(),
                prisma.post.count(),
                prisma.demand.count(),
                prisma.order.count({ where: { status: { in: ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED'] } } }),
                prisma.order.count({ where: { status: 'DISPUTED' } }),
            ]);
        return { users, stores, products, posts, demands, activeOrders, disputedOrders };
    },
    ['admin-overview-stats'],
    { revalidate: 900 } // Cache for 15 minutes
);

export async function GET() {
    const session = await getServerSession(authOptions);
    const check = requireAdmin(session, 'MODERATOR');
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

    const stats = await getOverviewStats();
    return NextResponse.json(stats);
}
