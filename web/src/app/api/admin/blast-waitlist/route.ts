/**
 * Admin endpoint to blast un-emailed waitlist users with the launch email.
 * POST /api/admin/blast-waitlist
 * Body: { secret: string, limit?: number }
 *
 * Idempotent — only sends to entries where launchEmailSentAt is null.
 * Call repeatedly (default limit=200) until remaining=0 to handle large
 * lists safely within Vercel's function timeout.
 */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';
import { sendWaitlistLaunchEmail } from '@/lib/email';

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    const check = requireAdmin(session, 'SUPER_ADMIN');
    if (!check.ok) return NextResponse.json({ message: check.error }, { status: check.status });

    const body = await req.json().catch(() => ({}));
    const { limit = 200 } = body as { limit?: number };

    // Only fetch entries that have NOT been blasted yet
    const entries = await prisma.waitlist.findMany({
        where: { launchEmailSentAt: null },
        select: { id: true, email: true },
        take: Math.min(Number(limit), 500), // hard cap at 500 per call
    });

    let sent = 0;
    for (const entry of entries) {
        await sendWaitlistLaunchEmail(entry.email);
        // Mark sent immediately — a mid-loop timeout won't re-send this entry
        await prisma.waitlist.update({
            where: { id: entry.id },
            data: { launchEmailSentAt: new Date() },
        });
        sent++;
        await sleep(150); // Resend free tier: ~2 req/s
    }

    const remaining = await prisma.waitlist.count({ where: { launchEmailSentAt: null } });

    return NextResponse.json({
        message: `Sent to ${sent} users. ${remaining} still pending.`,
        sent,
        remaining,
    });
}
