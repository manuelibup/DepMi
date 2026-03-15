import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

const schema = z.object({
    title: z.string().min(1).max(100),
    body: z.string().min(1).max(500),
    link: z.string().optional(),
});

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    const role = session?.user?.adminRole;
    if (!role || !['SUPER_ADMIN', 'ADMIN'].includes(role)) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const raw = await req.json();
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
        return NextResponse.json({ message: 'Invalid data' }, { status: 400 });
    }

    const users = await prisma.user.findMany({
        where: { isBanned: false },
        select: { id: true },
    });

    if (users.length === 0) {
        return NextResponse.json({ message: 'No users', count: 0 });
    }

    const BATCH = 500;
    let total = 0;
    for (let i = 0; i < users.length; i += BATCH) {
        const batch = users.slice(i, i + BATCH);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (prisma.notification as any).createMany({
            data: batch.map((u) => ({
                userId: u.id,
                type: 'ANNOUNCEMENT',
                title: parsed.data.title,
                body: parsed.data.body,
                link: parsed.data.link ?? null,
                isRead: false,
            })),
        });
        total += result.count;
    }

    return NextResponse.json({ message: `Announcement sent to ${total} users`, count: total });
}
