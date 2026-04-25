import { NextRequest, NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { sendTelegramMessage, getTelegramFileUrl, setTelegramWebhook, TelegramUpdate } from '@/lib/bot/telegram';
import { handleProductPost, handleTextOnlyMessage } from '@/lib/bot/universal-handler';

export const maxDuration = 60;

/**
 * POST /api/webhooks/telegram
 * Telegram sends every update here as a POST with a JSON body.
 * No signature validation needed — Telegram uses a secret token in the URL
 * (set via TELEGRAM_WEBHOOK_SECRET env var, appended as ?secret=XXX).
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
    // Optional: validate the secret token query param Telegram includes
    const secret = req.nextUrl.searchParams.get('secret');
    if (process.env.TELEGRAM_WEBHOOK_SECRET && secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
        return NextResponse.json({ ok: false }, { status: 401 });
    }

    let update: TelegramUpdate;
    try {
        update = await req.json();
    } catch {
        return NextResponse.json({ ok: true });
    }

    // Respond 200 immediately, but keep the function alive until processing completes
    waitUntil(processAsync(update));

    return NextResponse.json({ ok: true });
}

/**
 * GET /api/webhooks/telegram/register
 * One-time setup endpoint — call this once to register the webhook with Telegram.
 * Protected by CRON_SECRET so it can't be called by anyone.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ ok: false }, { status: 401 });
    }

    const webhookUrl = `${process.env.NEXTAUTH_URL}/api/webhooks/telegram${
        process.env.TELEGRAM_WEBHOOK_SECRET ? `?secret=${process.env.TELEGRAM_WEBHOOK_SECRET}` : ''
    }`;

    const ok = await setTelegramWebhook(webhookUrl);
    return NextResponse.json({ ok, webhookUrl });
}

// ─── Processing ───────────────────────────────────────────────────────────────

async function processAsync(update: TelegramUpdate): Promise<void> {
    try {
        const message = update.message || update.channel_post;
        if (!message) return;

        const chatId = message.chat.id;
        const caption = message.caption || message.text || '';

        const reply = (text: string) => sendTelegramMessage(chatId, text);

        // Image message — this is what vendors will send
        if (message.photo && message.photo.length > 0) {
            // Telegram sends multiple sizes — take the largest (last in array)
            const bestPhoto = message.photo[message.photo.length - 1];

            let imageUrl: string | null = null;
            try {
                imageUrl = await getTelegramFileUrl(bestPhoto.file_id);
            } catch (err) {
                console.error('[telegram-webhook] Failed to get file URL:', err);
            }

            await handleProductPost(
                {
                    platform: 'TELEGRAM',
                    postId: String(message.message_id),
                    imageUrl,
                    caption,
                },
                reply
            );
            return;
        }

        // Document sent as image (some clients send photos as documents)
        if (message.document && message.document.mime_type?.startsWith('image/')) {
            let imageUrl: string | null = null;
            try {
                imageUrl = await getTelegramFileUrl(message.document.file_id);
            } catch {
                // ignore
            }

            await handleProductPost(
                {
                    platform: 'TELEGRAM',
                    postId: String(message.message_id),
                    imageUrl,
                    caption,
                },
                reply
            );
            return;
        }

        // Text-only message — send instructions
        await handleTextOnlyMessage('TELEGRAM', reply);
    } catch (err) {
        console.error('[telegram-webhook] Error:', err);
    }
}
