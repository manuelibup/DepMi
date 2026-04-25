import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Cleanup cron — runs every 6 hours via cron-job.org.
 * Deletes expired BotSession and BotImportToken rows.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ ok: false }, { status: 401 });
    }

    const now = new Date();

    const [deletedSessions, deletedTokens] = await Promise.all([
        prisma.botSession.deleteMany({
            where: {
                expiresAt: { lt: now },
                // Keep the Twitter watermark record
                NOT: { externalId: '__watermark__' },
            },
        }),
        prisma.botImportToken.deleteMany({
            where: { expiresAt: { lt: now } },
        }),
    ]);

    return NextResponse.json({
        ok: true,
        deletedSessions: deletedSessions.count,
        deletedTokens: deletedTokens.count,
    });
}
