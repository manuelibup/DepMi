/**
 * Universal bot handler — the ONLY logic every platform needs.
 *
 * Flow:
 *  1. Receive image URL + caption from any platform
 *  2. Upload image to Cloudinary (server-side)
 *  3. AI-parse the product details
 *  4. Create a 30-min BotImportToken (storeId = null until vendor picks on web)
 *  5. Call sendReply() with the magic link — one message, done
 *
 * The vendor clicks the link → logs in on DepMi → picks their store → confirms → listed.
 * No multi-turn conversation, no state machine, no platform-specific auth needed.
 */

import { prisma } from '@/lib/prisma';
import { BotPlatform } from '@prisma/client';
import { uploadFromUrl } from './cloudinary';
import { parseProductFromPost } from './ai-parser';

const BASE_URL = process.env.NEXTAUTH_URL || 'https://depmi.com';

export interface BotIncomingPost {
    platform: BotPlatform;
    postId: string;       // unique ID for this message/post (for deduplication)
    imageUrl: string | null;
    caption: string;
}

/**
 * Handle a product post from any platform.
 * @param post     - the incoming image + caption
 * @param sendReply - platform-specific function to send the reply message
 */
export async function handleProductPost(
    post: BotIncomingPost,
    sendReply: (text: string) => Promise<void>
): Promise<void> {
    const { platform, postId, imageUrl, caption } = post;

    // Deduplicate — ignore if we already processed this post
    const existing = await prisma.botImportToken.findFirst({
        where: { platform, postId, used: false, expiresAt: { gt: new Date() } },
    });
    if (existing) {
        const link = `${BASE_URL}/bot/import?token=${existing.id}`;
        await sendReply(`Your listing link is still active: ${link}`);
        return;
    }

    // Upload image to Cloudinary (server-side, no browser)
    let cloudinaryUrl = '';
    if (imageUrl) {
        try {
            cloudinaryUrl = await uploadFromUrl(imageUrl);
        } catch (err) {
            console.error(`[bot/${platform}] Cloudinary upload failed:`, err);
        }
    }

    // AI-parse the product (optional — skipped if ANTHROPIC_API_KEY is not set)
    let parsed = null;
    if (process.env.ANTHROPIC_API_KEY) {
        try {
            parsed = await parseProductFromPost(cloudinaryUrl || null, caption);
        } catch (err) {
            console.error(`[bot/${platform}] AI parse failed:`, err);
        }
    }

    // Create import token (30-min TTL, storeId null — vendor picks on web)
    const token = await prisma.botImportToken.create({
        data: {
            platform,
            postId,
            storeId: null,
            parsedData: (parsed ?? { title: '', price: 0, description: caption.substring(0, 500), category: 'OTHER', confidence: 'low' }) as object,
            imageUrls: cloudinaryUrl ? [cloudinaryUrl] : [],
            expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        },
    });

    const link = `${BASE_URL}/bot/import?token=${token.id}`;

    if (parsed) {
        const confidenceNote = parsed.confidence === 'low'
            ? '\n\n⚠️ I wasn\'t sure about the price — double-check it on the page.'
            : '';
        await sendReply(
            `I found: *${parsed.title}* — ₦${parsed.price > 0 ? parsed.price.toLocaleString() : '?'}${confidenceNote}\n\n` +
            `Click to review and list it on DepMi (link expires in 30 min):\n${link}`
        );
    } else {
        await sendReply(
            `Got your photo! ✅\n\n` +
            `Click the link below to fill in the details and list it on DepMi (expires in 30 min):\n${link}`
        );
    }
}

/**
 * Handle a non-image message (text only) — send onboarding instructions.
 */
export async function handleTextOnlyMessage(
    platform: BotPlatform,
    sendReply: (text: string) => Promise<void>
): Promise<void> {
    const platformName = {
        WHATSAPP: 'WhatsApp',
        TELEGRAM: 'Telegram',
        INSTAGRAM: 'Instagram',
        TWITTER: 'X (Twitter)',
    }[platform];

    await sendReply(
        `👋 I'm the DepMi Bot!\n\n` +
        `Send me a *photo of your product* with the price in the caption and I'll list it on DepMi automatically.\n\n` +
        `${platform === 'WHATSAPP' || platform === 'TELEGRAM'
            ? 'Just forward or send a product photo here.'
            : `Tag @depmibot on your ${platformName} post.`}`
    );
}
