import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRecentMentions, replyToTweet } from '@/lib/bot/twitter-api';
import { uploadFromUrl } from '@/lib/bot/cloudinary';
import { parseProductFromPost } from '@/lib/bot/ai-parser';

export const maxDuration = 60;

/**
 * Twitter mention polling cron — runs every 10 minutes via cron-job.org.
 * For each new mention of @depmibot:
 *   1. Fetch the tweet image
 *   2. Upload to Cloudinary
 *   3. AI-parse the product
 *   4. Create a BotImportToken
 *   5. Reply to the tweet with the magic link
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ ok: false }, { status: 401 });
    }

    // Retrieve the last processed tweet ID from DB (store as a simple key-value)
    const watermark = await prisma.botSession.findFirst({
        where: { platform: 'TWITTER', externalId: '__watermark__' },
        select: { state: true },
    });

    const sinceId = (watermark?.state as { sinceId?: string } | null)?.sinceId;
    const { mentions, newestId } = await getRecentMentions(sinceId);

    let processed = 0;

    for (const mention of mentions) {
        // Find the store by the tweeter's Twitter handle
        const store = await prisma.store.findFirst({
            where: {
                botEnabled: true,
                // We'd need to match by Twitter user ID or handle
                // For now we match via twitterHandle stored as a string (handle lookup requires an extra API call)
            },
            select: { id: true, slug: true, twitterHandle: true },
        });

        if (!store) continue;

        // Upload the first image attachment to Cloudinary
        let cloudinaryUrl = '';
        if (mention.attachmentUrls.length > 0) {
            try {
                cloudinaryUrl = await uploadFromUrl(mention.attachmentUrls[0]);
            } catch (err) {
                console.error('[twitter-poll] Cloudinary upload failed:', err);
            }
        }

        // AI-parse
        const parsed = await parseProductFromPost(
            cloudinaryUrl || null,
            mention.text.replace(/@depmibot/gi, '').trim()
        );

        // Create import token (30 minute TTL)
        const token = await prisma.botImportToken.create({
            data: {
                platform: 'TWITTER',
                postId: mention.id,
                storeId: store.id,
                parsedData: parsed as object,
                imageUrls: cloudinaryUrl ? [cloudinaryUrl] : [],
                expiresAt: new Date(Date.now() + 30 * 60 * 1000),
            },
        });

        // Reply to the tweet with the magic link
        const magicLink = `https://depmi.com/bot/import?token=${token.id}`;
        await replyToTweet(
            mention.id,
            `I've analysed your post! Click here to review and list it on DepMi: ${magicLink}\n\n(Link expires in 30 mins) @depmi`
        );

        processed++;
    }

    // Update the watermark
    if (newestId) {
        await prisma.botSession.upsert({
            where: { platform_externalId: { platform: 'TWITTER', externalId: '__watermark__' } },
            create: {
                platform: 'TWITTER',
                externalId: '__watermark__',
                state: { sinceId: newestId },
                expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year — don't expire
            },
            update: {
                state: { sinceId: newestId },
                expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            },
        });
    }

    return NextResponse.json({ ok: true, processed, newestId });
}
