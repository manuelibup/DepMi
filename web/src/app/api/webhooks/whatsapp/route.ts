import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { sendText, getMediaUrl, downloadMedia } from '@/lib/bot/whatsapp-api';
import { handleProductPost, handleTextOnlyMessage } from '@/lib/bot/universal-handler';
import { uploadFromUrl } from '@/lib/bot/cloudinary';

export const maxDuration = 60;

// ─── Webhook verification (GET) ───────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
        return new NextResponse(challenge, { status: 200 });
    }

    return NextResponse.json({ ok: false }, { status: 403 });
}

// ─── Incoming messages (POST) ─────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
    const rawBody = await req.text();
    const signature = req.headers.get('x-hub-signature-256') ?? '';

    if (!validateSignature(rawBody, signature)) {
        console.error('[whatsapp-webhook] Invalid signature');
        return NextResponse.json({ ok: false }, { status: 401 });
    }

    let body: WhatsAppWebhookPayload;
    try {
        body = JSON.parse(rawBody);
    } catch {
        return NextResponse.json({ ok: true });
    }

    // Return 200 immediately — WhatsApp requires response within 5 seconds
    void processAsync(body);

    return NextResponse.json({ ok: true });
}

// ─── Processing ───────────────────────────────────────────────────────────────

async function processAsync(body: WhatsAppWebhookPayload): Promise<void> {
    try {
        const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
        if (!message) return;

        const phone = message.from;
        if (!phone) return;

        const reply = (text: string) => sendText(phone, text);

        if (message.type === 'image' && message.image?.id) {
            // Download from WhatsApp CDN (requires Authorization header) then re-upload to Cloudinary
            let cloudinaryUrl: string | null = null;
            try {
                const mediaUrl = await getMediaUrl(message.image.id);
                const buffer = await downloadMedia(mediaUrl);
                const base64 = Buffer.from(buffer).toString('base64');
                cloudinaryUrl = await uploadFromUrl(`data:image/jpeg;base64,${base64}`);
            } catch (err) {
                console.error('[whatsapp-webhook] Image processing failed:', err);
            }

            await handleProductPost(
                {
                    platform: 'WHATSAPP',
                    postId: message.id || `${phone}-${Date.now()}`,
                    imageUrl: cloudinaryUrl,
                    caption: message.image?.caption || '',
                },
                reply
            );
            return;
        }

        // Any non-image message → instructions
        await handleTextOnlyMessage('WHATSAPP', reply);
    } catch (err) {
        console.error('[whatsapp-webhook] Error:', err);
    }
}

// ─── Signature validation ──────────────────────────────────────────────────────

function validateSignature(rawBody: string, signature: string): boolean {
    if (!process.env.WHATSAPP_APP_SECRET) return false;
    const expected = `sha256=${crypto
        .createHmac('sha256', process.env.WHATSAPP_APP_SECRET)
        .update(rawBody)
        .digest('hex')}`;
    try {
        return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    } catch {
        return false;
    }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface WhatsAppWebhookPayload {
    entry?: Array<{
        changes?: Array<{
            value?: {
                messages?: Array<{
                    id?: string;
                    from: string;
                    type: string;
                    image?: { id: string; caption?: string };
                    text?: { body: string };
                }>;
            };
        }>;
    }>;
}
