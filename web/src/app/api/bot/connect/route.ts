import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendTelegramMessage } from '@/lib/bot/telegram';

/** GET /api/bot/connect?token=xxx — validate token, return chatId */
export async function GET(req: NextRequest) {
    const tokenId = req.nextUrl.searchParams.get('token');
    if (!tokenId) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

    const token = await prisma.botConnectToken.findUnique({ where: { id: tokenId } });
    if (!token || token.used || token.expiresAt < new Date()) {
        return NextResponse.json(
            { error: 'This link has expired. Send /connect in the DepMi bot to get a new one.' },
            { status: 410 }
        );
    }

    return NextResponse.json({ chatId: token.chatId });
}

/** POST /api/bot/connect — link Telegram account to a store */
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: { tokenId?: string; storeId?: string };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }

    const { tokenId, storeId } = body;
    if (!tokenId || !storeId) {
        return NextResponse.json({ error: 'Missing tokenId or storeId' }, { status: 400 });
    }

    const token = await prisma.botConnectToken.findUnique({ where: { id: tokenId } });
    if (!token || token.used || token.expiresAt < new Date()) {
        return NextResponse.json({ error: 'Link expired. Send /connect again.' }, { status: 410 });
    }

    const store = await prisma.store.findUnique({
        where: { id: storeId },
        select: { id: true, name: true, ownerId: true },
    });
    if (!store || store.ownerId !== session.user.id) {
        return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    await prisma.botConnectToken.update({ where: { id: tokenId }, data: { used: true } });

    await prisma.botSession.upsert({
        where: { platform_externalId: { platform: 'TELEGRAM', externalId: token.chatId } },
        create: {
            platform: 'TELEGRAM',
            externalId: token.chatId,
            userId: session.user.id,
            storeId,
            state: { step: 'idle' },
            expiresAt: null,
        },
        update: {
            userId: session.user.id,
            storeId,
            state: { step: 'idle' },
            expiresAt: null,
        },
    });

    try {
        await sendTelegramMessage(
            token.chatId,
            `✅ *Connected!*\n\n` +
            `Your Telegram is now linked to *${store.name}* on DepMi.\n\n` +
            `Send me a *photo* of any product to list it instantly — no browser needed.\n\n` +
            `Commands:\n` +
            `/products — view your recent listings\n` +
            `/orders — view pending orders\n` +
            `/disconnect — unlink this account`
        );
    } catch {
        // Non-fatal — bot message is a bonus
    }

    return NextResponse.json({ ok: true, storeName: store.name });
}
