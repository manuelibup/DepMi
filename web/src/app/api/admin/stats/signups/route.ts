import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    const check = requireAdmin(session, 'ADMIN');
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

    const period = req.nextUrl.searchParams.get('period') ?? 'day';
    const trunc = period === 'month' ? 'month' : period === 'week' ? 'week' : 'day';
    const limit = period === 'month' ? 12 : 30;

    const rows = await prisma.$queryRawUnsafe<{ date: Date; count: bigint }[]>(`
        SELECT DATE_TRUNC('${trunc}', "createdAt") AS date, COUNT(*) AS count
        FROM "User"
        GROUP BY date
        ORDER BY date DESC
        LIMIT ${limit}
    `);

    const data = rows
        .map(r => ({ date: r.date.toISOString().split('T')[0], count: Number(r.count) }))
        .reverse();

    return NextResponse.json(data);
}
