import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { endpoint, keys } = body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
    }

    await prisma.pushSubscription.upsert({
        where: { endpoint },
        create: { userId: session.user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
        update: { userId: session.user.id, p256dh: keys.p256dh, auth: keys.auth },
    });

    return NextResponse.json({ ok: true });
}
