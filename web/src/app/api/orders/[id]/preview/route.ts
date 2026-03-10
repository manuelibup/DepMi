import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
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
                seller: { select: { name: true, ownerId: true } },
                buyer: { select: { id: true } },
                items: {
                    include: { product: { select: { title: true, images: { take: 1 } } } },
                    take: 1
                }
            }
        });

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        // Security: only buyer or seller can see the preview
        if (order.buyer.id !== session.user.id && order.seller.ownerId !== session.user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const product = order.items[0]?.product;

        return NextResponse.json({
            id: order.id,
            status: order.status,
            totalAmount: order.totalAmount,
            productTitle: product?.title || 'Unknown Product',
            thumbnail: product?.images[0]?.url || null,
            storeName: order.seller.name
        });
    } catch (error) {
        console.error('[order-preview] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
