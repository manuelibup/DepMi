import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { fetchMediaDetails, replyToComment } from '@/lib/bot/instagram-api';
import { uploadFromUrl } from '@/lib/bot/cloudinary';
import { parseProductFromPost } from '@/lib/bot/ai-parser';

export const maxDuration = 60;

// ─── Webhook verification (GET) ──────────────────────────────────────────────

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

// ─── Incoming mentions (POST) ────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
    const rawBody = await req.text();
    const signature = req.headers.get('x-hub-signature-256') ?? '';

    if (!validateSignature(rawBody, signature)) {
        console.error('[instagram-webhook] Invalid signature');
        return NextResponse.json({ ok: false }, { status: 401 });
    }

    let body: object;
    try {
        body = JSON.parse(rawBody);
    } catch {
        return NextResponse.json({ ok: true });
    }

    void processAsync(body as InstagramWebhookPayload);

    return NextResponse.json({ ok: true });
}

// ─── Async processing ────────────────────────────────────────────────────────

async function processAsync(body: InstagramWebhookPayload): Promise<void> {
    try {
        for (const entry of body.entry ?? []) {
            for (const change of entry.changes ?? []) {
                if (change.field !== 'mentions' && change.field !== 'comments') continue;

                const { media_id, comment_id, text, from } = change.value ?? {};
                if (!media_id || !comment_id) continue;

                // Check if @depmibot is mentioned
                if (!text?.toLowerCase().includes('@depmibot')) continue;

                // Find the store whose instagramHandle matches the media owner
                // (We look up by the commenter's Instagram username if from.username is present)
                const igHandle = from?.username;
                if (!igHandle) continue;

                const store = await prisma.store.findFirst({
                    where: { instagramHandle: igHandle, botEnabled: true },
                    select: { id: true, slug: true },
                });

                if (!store) {
                    // Unknown store — encourage them to connect
                    await replyToComment(
                        comment_id,
                        `@${igHandle} Connect your store to depmi.com to auto-list this product! Go to your store settings and add your Instagram handle.`
                    );
                    continue;
                }

                // Fetch the post image and caption
                let imageUrl = '';
                let caption = text || '';
                try {
                    const mediaDetails = await fetchMediaDetails(media_id);
                    imageUrl = mediaDetails.imageUrl;
                    caption = mediaDetails.caption || text || '';
                } catch (err) {
                    console.error('[instagram-webhook] Media fetch failed:', err);
                }

                // Upload image to Cloudinary
                let cloudinaryUrl = '';
                if (imageUrl) {
                    try {
                        cloudinaryUrl = await uploadFromUrl(imageUrl);
                    } catch (err) {
                        console.error('[instagram-webhook] Cloudinary upload failed:', err);
                    }
                }

                // Parse the product with AI
                const parsed = await parseProductFromPost(cloudinaryUrl || null, caption);

                // Create a BotImportToken valid for 30 minutes
                const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
                const token = await prisma.botImportToken.create({
                    data: {
                        platform: 'INSTAGRAM',
                        postId: media_id,
                        storeId: store.id,
                        parsedData: parsed as object,
                        imageUrls: cloudinaryUrl ? [cloudinaryUrl] : [],
                        expiresAt,
                    },
                });

                // Reply to the comment with the magic link
                const magicLink = `https://depmi.com/bot/import?token=${token.id}`;
                await replyToComment(
                    comment_id,
                    `@${igHandle} I've analysed your post! Click here to review and list it on DepMi: ${magicLink} (link expires in 30 minutes)`
                );
            }
        }
    } catch (err) {
        console.error('[instagram-webhook] Processing error:', err);
    }
}

// ─── Signature validation ────────────────────────────────────────────────────

function validateSignature(rawBody: string, signature: string): boolean {
    const secret = process.env.INSTAGRAM_APP_SECRET || process.env.WHATSAPP_APP_SECRET;
    if (!secret) return false;
    const expected = `sha256=${crypto.createHmac('sha256', secret).update(rawBody).digest('hex')}`;
    try {
        return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    } catch {
        return false;
    }
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface InstagramWebhookPayload {
    entry?: Array<{
        changes?: Array<{
            field: string;
            value?: {
                media_id?: string;
                comment_id?: string;
                text?: string;
                from?: { username?: string; id?: string };
            };
        }>;
    }>;
}
