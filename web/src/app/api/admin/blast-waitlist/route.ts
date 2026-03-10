/**
 * One-time admin endpoint to blast all waitlist users with the launch email.
 * GET /api/admin/blast-waitlist?secret=<ADMIN_SECRET>
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendWaitlistLaunchEmail } from '@/lib/email';

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get('secret');

    if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const entries = await prisma.waitlist.findMany({ select: { email: true } });

    let sent = 0;
    for (const entry of entries) {
        await sendWaitlistLaunchEmail(entry.email);
        sent++;
        // Resend free tier: ~2 req/s — 150ms gap keeps us safely under the limit
        await sleep(150);
    }

    return NextResponse.json({ message: `Launch email sent to ${sent} waitlist users` });
}
