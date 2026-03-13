import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ ok: false }, { status: 401 });
    }

    const userId = session.user.id;
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // Only write if never pinged or last ping was >1 hour ago (reduces DB writes)
    await prisma.user.updateMany({
        where: {
            id: userId,
            OR: [
                { lastActiveAt: null },
                { lastActiveAt: { lt: oneHourAgo } },
            ],
        },
        data: { lastActiveAt: new Date() },
    });

    return NextResponse.json({ ok: true });
}
