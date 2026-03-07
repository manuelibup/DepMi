import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('orderId');

    if (!orderId) return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });

    try {
        const order = (await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                // payment: true,
                items: { include: { product: true } },
            }
        })) as any;

        if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        if (order.buyerId !== session.user.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if (order.status !== 'PENDING') return NextResponse.json({ error: 'Order is not in pending state' }, { status: 400 });

        // Check expiration
        const created = new Date(order.createdAt).getTime();
        const now = Date.now();
        if (now - created > 30 * 60 * 1000) {
            return NextResponse.json({ error: 'Payment window expired' }, { status: 400 });
        }

        return NextResponse.json({
            orderId: order.id,
            virtualAccount: {
                accountNumber: order.payment?.virtualAccountNumber,
                bankName: order.payment?.bankName,
                accountName: order.payment?.accountName,
                expiresAt: order.payment?.expiresAt,
            },
            breakdown: {
                subtotal: Number(order.subtotal),
                deliveryFee: Number(order.deliveryFee),
                processingFee: Number(order.processingFee),
                total: Number(order.total),
            },
            createdAt: order.createdAt,
        });

    } catch (err) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
