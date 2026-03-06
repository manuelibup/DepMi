import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NotificationType } from '@prisma/client';

export async function POST(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

        const { id: orderId } = await params;

        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                seller: { select: { ownerId: true, name: true } },
                buyer: { select: { id: true } },
            },
        });

        if (!order) return NextResponse.json({ message: 'Order not found' }, { status: 404 });
        if (order.seller.ownerId !== session.user.id) return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
        if (order.status !== 'CONFIRMED') return NextResponse.json({ message: 'Order must be in CONFIRMED state to mark as shipped' }, { status: 400 });

        await prisma.$transaction([
            prisma.order.update({
                where: { id: orderId },
                data: { status: 'SHIPPED' },
            }),
            prisma.notification.create({
                data: {
                    userId: order.buyerId,
                    type: NotificationType.ORDER_SHIPPED,
                    title: 'Your Order Has Been Shipped!',
                    body: `${order.seller.name} has shipped your order. You can now confirm delivery once it arrives.`,
                    link: `/orders`,
                },
            }),
        ]);

        return NextResponse.json({ message: 'Order marked as shipped' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error('Ship order error:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
