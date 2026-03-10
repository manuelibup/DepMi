/**
 * One-time admin endpoint to retroactively seed default follows for all existing users.
 * Protected by ADMIN_SECRET env var.
 * GET /api/admin/seed-follows?secret=<ADMIN_SECRET>
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { seedDefaultFollows } from '@/lib/auto-follow';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get('secret');

    if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

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
