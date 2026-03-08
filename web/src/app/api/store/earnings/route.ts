import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const store = await prisma.store.findFirst({
            where: { ownerId: session.user.id },
            select: { id: true }
        });

        if (!store) {
            return NextResponse.json({ error: 'Store not found' }, { status: 404 });
        }

        // Aggregate Earnings
        // 1. Total Earned: Orders with status 'COMPLETED' and escrowStatus 'RELEASED'
        const completedOrders = await prisma.order.findMany({
            where: {
                sellerId: store.id,
                status: 'COMPLETED',
                escrowStatus: 'RELEASED'
            },
            select: { totalAmount: true, platformFeeNgn: true }
        });

        const totalEarned = completedOrders.reduce((sum, order) => {
            const amount = Number(order.totalAmount);
            const fee = Number(order.platformFeeNgn || 0);
            return sum + (amount - fee);
        }, 0);

        // 2. Pending Escrow: Orders that are SHIPPED, DELIVERED, or CONFIRMED but not yet RELEASED
        const pendingOrders = await prisma.order.findMany({
            where: {
                sellerId: store.id,
                status: { in: ['CONFIRMED', 'SHIPPED', 'DELIVERED'] },
                escrowStatus: { not: 'RELEASED' }
            },
            select: { totalAmount: true, platformFeeNgn: true }
        });

        const pendingEscrow = pendingOrders.reduce((sum, order) => {
            // Processing fee is already paid by buyer, platform fee (5%) will be deducted on release
            const amount = Number(order.totalAmount);
            const estimatedFee = amount * 0.05; 
            return sum + (amount - estimatedFee);
        }, 0);

        return NextResponse.json({
            totalEarned,
            pendingEscrow,
            orderCount: completedOrders.length,
            pendingCount: pendingOrders.length
        });
    } catch (error) {
        console.error('Earnings API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
