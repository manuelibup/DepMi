/**
 * One-time admin endpoint to retroactively seed default follows for all existing users.
 * POST /api/admin/seed-follows
 * Body: { secret: string }
 */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';
import { seedDefaultFollows } from '@/lib/autoFollow';

export async function POST() {
    const session = await getServerSession(authOptions);
    const check = requireAdmin(session, 'SUPER_ADMIN');
    if (!check.ok) return NextResponse.json({ message: check.error }, { status: check.status });

    const users = await prisma.user.findMany({ select: { id: true } });

    // Run in batches of 50 to avoid overwhelming the DB
    const BATCH = 50;
    let processed = 0;
    for (let i = 0; i < users.length; i += BATCH) {
        await Promise.all(users.slice(i, i + BATCH).map(u => seedDefaultFollows(u.id)));
        processed += Math.min(BATCH, users.length - i);
    }

    return NextResponse.json({ message: `Seeded follows for ${processed} users` });
}
