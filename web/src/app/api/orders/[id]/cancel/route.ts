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
            select: { buyerId: true, status: true }
        });

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        if (order.buyerId !== session.user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        if (order.status !== 'PENDING') {
            return NextResponse.json({ error: 'Cannot cancel an order that is not pending.' }, { status: 400 });
        }

        await prisma.order.update({
            where: { id: orderId },
            data: { status: 'CANCELLED' }
        });

        return NextResponse.json({ success: true, message: 'Order cancelled successfully.' });
    } catch (error) {
        console.error('[order-cancel] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
