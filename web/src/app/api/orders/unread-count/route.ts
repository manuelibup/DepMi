import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ count: 0 });
    // Count PENDING orders where user is the seller
    const count = await prisma.order.count({
        where: { sellerId: session.user.id, status: 'PENDING' },
    });
    return NextResponse.json({ count }, {
        headers: {
            // Cache per-user for 30s, allow stale for 60s — prevents a DB hit on every page nav
            'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
        },
    });
}

