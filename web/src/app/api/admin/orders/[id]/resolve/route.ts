import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';

type Resolution = 'RESOLVED_BUYER' | 'RESOLVED_VENDOR' | 'REFUNDED';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    const check = requireAdmin(session, 'ADMIN');
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { resolution } = body as { resolution?: Resolution };

    const valid: Resolution[] = ['RESOLVED_BUYER', 'RESOLVED_VENDOR', 'REFUNDED'];
    if (!resolution || !valid.includes(resolution)) {
        return NextResponse.json({ error: 'Invalid resolution' }, { status: 400 });
    }

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    if (order.status !== 'DISPUTED') return NextResponse.json({ error: 'Order is not disputed' }, { status: 400 });

    const escrowStatus = resolution === 'RESOLVED_VENDOR' ? 'RELEASING' : 'RELEASED';

    const updated = await prisma.order.update({
        where: { id },
        data: { status: resolution, escrowStatus },
        select: { id: true, status: true, escrowStatus: true },
    });

    return NextResponse.json({ success: true, order: updated });
}
