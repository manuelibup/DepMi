import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: orderId } = await params;

    try {
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            select: { buyerId: true, sellerId: true, status: true, paystackRef: true, escrowStatus: true }
        });

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        const isBuyer = order.buyerId === session.user.id;

        // Check if requester is the seller (sellerId is the Store id)
        let isSeller = false;
        if (!isBuyer) {
            const storeCheck = await prisma.store.findFirst({
                where: { id: order.sellerId, ownerId: session.user.id },
                select: { id: true },
            });
            isSeller = !!storeCheck;
        }

        if (!isBuyer && !isSeller) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Buyer: can cancel PENDING orders only (if no payment initiated)
        if (isBuyer) {
            if (order.status !== 'PENDING') {
                return NextResponse.json({ error: 'Cannot cancel an order that is not pending.' }, { status: 400 });
            }
            if (order.paystackRef) {
                return NextResponse.json({
                    error: 'A payment was initiated for this order. Use "Verify Payment" first to check if it went through.',
                }, { status: 409 });
            }
            await prisma.order.update({ where: { id: orderId }, data: { status: 'CANCELLED' } });
            return NextResponse.json({ success: true, message: 'Order cancelled.' });
        }

        // Seller: can cancel PENDING or CONFIRMED orders (before shipping)
        if (!['PENDING', 'CONFIRMED'].includes(order.status)) {
            return NextResponse.json({ error: 'Cannot cancel an order that has already been shipped or completed.' }, { status: 400 });
        }

        // If payment was already held in escrow, mark as REFUNDED so admin can release it
        const newStatus = order.escrowStatus === 'HELD' ? 'REFUNDED' : 'CANCELLED';
        await prisma.order.update({
            where: { id: orderId },
            data: {
                status: newStatus,
                ...(newStatus === 'REFUNDED' ? { escrowStatus: 'RELEASING' } : {}),
            },
        });

        return NextResponse.json({ success: true, message: newStatus === 'REFUNDED' ? 'Order cancelled. Buyer refund queued.' : 'Order cancelled.' });
    } catch (error) {
        console.error('[order-cancel] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
