import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';

export async function GET() {
    const session = await getServerSession(authOptions);
    const check = requireAdmin(session, 'MODERATOR');
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

    const rows = await prisma.$queryRawUnsafe<{ date: Date; dau: bigint }[]>(`
        SELECT DATE_TRUNC('day', "lastActiveAt") AS date, COUNT(*) AS dau
        FROM "User"
        WHERE "lastActiveAt" IS NOT NULL
        GROUP BY date
        ORDER BY date ASC
    `);

    const data = rows.map(r => ({
        date: r.date.toISOString().split('T')[0],
        dau: Number(r.dau),
    }));

    return NextResponse.json(data);
}
