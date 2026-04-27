import { prisma } from '@/lib/prisma';
import { sendTelegramMessage, sendTelegramMessageWithButtons, escapeHtml } from './telegram';

async function notifySellerTelegram(storeId: string, text: string, buttons?: { text: string; url: string }[]): Promise<void> {
    try {
        const session = await prisma.botSession.findFirst({
            where: { storeId, platform: 'TELEGRAM', expiresAt: null },
        });
        if (!session) return;

        if (buttons && buttons.length > 0) {
            await sendTelegramMessageWithButtons(
                session.externalId,
                text,
                [buttons.map(b => ({ text: b.text, url: b.url }))],
                'HTML',
            );
        } else {
            await sendTelegramMessage(session.externalId, text, 'HTML');
        }
    } catch (err) {
        console.error('[bot/notify] Telegram seller notify failed:', err);
    }
}

export async function notifyUserTelegram(userId: string, text: string, buttons?: { text: string; url: string }[]): Promise<void> {
    try {
        const session = await prisma.botSession.findFirst({
            where: { userId, platform: 'TELEGRAM', expiresAt: null },
        });
        if (!session) return;

        if (buttons && buttons.length > 0) {
            await sendTelegramMessageWithButtons(
                session.externalId,
                text,
                [buttons.map(b => ({ text: b.text, url: b.url }))],
                'HTML',
            );
        } else {
            await sendTelegramMessage(session.externalId, text, 'HTML');
        }
    } catch (err) {
        console.error('[bot/notify] Telegram user notify failed:', err);
    }
}

export async function notifySellerNewOrder(
    storeId: string,
    order: { shortId: string; productTitle: string; amount: number; buyerName: string }
): Promise<void> {
    await notifySellerTelegram(
        storeId,
        `🛍 <b>New order!</b>\n\n` +
        `<b>${escapeHtml(order.productTitle)}</b>\n` +
        `₦${order.amount.toLocaleString()} from ${escapeHtml(order.buyerName)}\n` +
        `Order #${order.shortId}`,
        [{ text: '📋 View orders', url: 'https://depmi.com/orders' }]
    );
}

export async function notifySellerNewComment(
    storeId: string,
    comment: { productTitle: string; commenterName: string; body: string; productSlug: string }
): Promise<void> {
    const preview = comment.body.length > 100 ? comment.body.slice(0, 100) + '…' : comment.body;
    await notifySellerTelegram(
        storeId,
        `💬 <b>New comment on "${escapeHtml(comment.productTitle)}"</b>\n\n` +
        `<b>${escapeHtml(comment.commenterName)}:</b> ${escapeHtml(preview)}`,
        [{ text: '👀 View listing', url: `https://depmi.com/p/${comment.productSlug}` }]
    );
}

export async function notifySellerNewMessage(
    storeId: string,
    senderName: string
): Promise<void> {
    await notifySellerTelegram(
        storeId,
        `✉️ <b>New message from ${escapeHtml(senderName)}</b>`,
        [{ text: '💬 Reply', url: 'https://depmi.com/messages' }]
    );
}
