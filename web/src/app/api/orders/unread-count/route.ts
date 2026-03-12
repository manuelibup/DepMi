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
    return NextResponse.json({ count });
}
