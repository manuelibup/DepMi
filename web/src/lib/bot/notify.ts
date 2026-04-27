import { prisma } from '@/lib/prisma';
import { sendTelegramMessage } from './telegram';

async function notifySellerTelegram(storeId: string, message: string): Promise<void> {
    try {
        const session = await prisma.botSession.findFirst({
            where: { storeId, platform: 'TELEGRAM', expiresAt: null },
        });
        if (!session) return;
        await sendTelegramMessage(session.externalId, message);
    } catch (err) {
        console.error('[bot/notify] Telegram notify failed:', err);
    }
}

export async function notifyUserTelegram(userId: string, message: string): Promise<void> {
    try {
        const session = await prisma.botSession.findFirst({
            where: { userId, platform: 'TELEGRAM', expiresAt: null },
        });
        if (!session) return;
        await sendTelegramMessage(session.externalId, message);
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
        `🛍 *New order!*\n\n` +
        `*${order.productTitle}*\n` +
        `₦${order.amount.toLocaleString()} from ${order.buyerName}\n` +
        `Order #${order.shortId}\n\n` +
        `[View orders →](https://depmi.com/orders)`
    );
}

export async function notifySellerNewComment(
    storeId: string,
    comment: { productTitle: string; commenterName: string; body: string; productSlug: string }
): Promise<void> {
    const preview = comment.body.length > 80 ? comment.body.slice(0, 80) + '…' : comment.body;
    await notifySellerTelegram(
        storeId,
        `💬 *New comment on "${comment.productTitle}"*\n\n` +
        `${comment.commenterName}: _${preview}_\n\n` +
        `[View →](https://depmi.com/p/${comment.productSlug})`
    );
}

export async function notifySellerNewMessage(
    storeId: string,
    senderName: string
): Promise<void> {
    await notifySellerTelegram(
        storeId,
        `✉️ *New message from ${senderName}*\n\n` +
        `[Reply →](https://depmi.com/messages)`
    );
}
