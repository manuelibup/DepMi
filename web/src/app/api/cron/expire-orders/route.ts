import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const PAYMENT_WINDOW_HOURS = 2;

/**
 * GET /api/cron/expire-orders
 * Called by Vercel Cron every hour.
 * Cancels PENDING orders that were created more than 2 hours ago
 * and have never been paid (status is still PENDING).
 */
export async function GET(req: NextRequest) {
    // Verify this is called by Vercel Cron (or internally)
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cutoff = new Date(Date.now() - PAYMENT_WINDOW_HOURS * 60 * 60 * 1000);

    try {
        const result = await prisma.order.updateMany({
            where: {
                status: 'PENDING',
                createdAt: { lt: cutoff },
            },
            data: { status: 'CANCELLED' },
        });

        console.log(`[expire-orders] Cancelled ${result.count} expired orders (cutoff: ${cutoff.toISOString()})`);
        return NextResponse.json({ cancelled: result.count, cutoff: cutoff.toISOString() });
    } catch (err) {
        console.error('[expire-orders] Error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
