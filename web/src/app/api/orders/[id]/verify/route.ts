import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyByTxRef } from '@/lib/flutterwave';
import { notifyOrderUpdate } from '@/lib/notify-watchers';

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
            include: {
                buyer: true,
                seller: { include: { owner: true } },
                items: { include: { product: true }, take: 1 }
            }
        });

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        if (order.buyerId !== session.user.id && order.seller.ownerId !== session.user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        if (order.status !== 'PENDING') {
            return NextResponse.json({ message: 'Order already processed', status: order.status });
        }

        const txRef = order.paystackRef || `depmi-order-${order.id}`;
        const flwStatus = await verifyByTxRef(txRef);

        if (flwStatus && flwStatus.paid) {
            // Update order to CONFIRMED
            const platformFeeNgn = Math.round(Number(order.totalAmount) * 0.05 * 100) / 100;

            await prisma.order.update({
                where: { id: orderId },
                data: {
                    status: 'CONFIRMED',
                    escrowStatus: 'HELD',
                    platformFeeNgn,
                }
            });

            // Notify seller
            await prisma.notification.create({
                data: {
                    userId: order.seller.ownerId,
                    type: 'ORDER_CONFIRMED',
                    title: 'New order payment received',
                    body: `Order #${orderId.slice(-6).toUpperCase()} has been paid (₦${Number(order.totalAmount).toLocaleString()}). Prepare to ship.`,
                    link: '/orders',
                },
            });

            return NextResponse.json({ success: true, message: 'Payment verified and order confirmed!' });
        } else {
            return NextResponse.json({
                success: false,
                message: 'No successful payment found on Flutterwave for this order. If you just paid, please wait a minute and try again.'
            });
        }
    } catch (error) {
        console.error('[order-verify] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
