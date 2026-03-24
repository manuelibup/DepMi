import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const EXPIRE_AFTER_MS = 15 * 60 * 1000; // matches client-side threshold

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: orderId } = await params;

    const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: { buyerId: true, status: true, paystackRef: true, createdAt: true },
    });

    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (order.buyerId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Already done — idempotent
    if (order.status !== 'PENDING') return NextResponse.json({ ok: true });

    // If payment was initiated, don't cancel — it might still confirm
    if (order.paystackRef) return NextResponse.json({ ok: true });

    // Server-side age check
    if (Date.now() - new Date(order.createdAt).getTime() < EXPIRE_AFTER_MS) {
        return NextResponse.json({ ok: true });
    }

    await prisma.order.update({ where: { id: orderId }, data: { status: 'CANCELLED' } });

    return NextResponse.json({ ok: true });
}
