/**
 * WhatsApp conversation state machine for the DepMi Bot.
 * Each incoming WhatsApp message triggers a call to processWhatsAppMessage().
 * State is persisted in the BotSession table between messages.
 */

import { prisma } from '@/lib/prisma';
import { Category } from '@prisma/client';
import { sendText, sendButtons, getMediaUrl, downloadMedia } from './whatsapp-api';
import { parseProductFromPost, ParsedBotProduct } from './ai-parser';
import { uploadFromUrl } from './cloudinary';
import { createProductFromBot } from './shared';

// ─── Types ──────────────────────────────────────────────────────────────────

type Step =
    | 'UNLINKED'
    | 'AWAITING_LINK_OTP'
    | 'IDLE'
    | 'AWAITING_CONFIRMATION'
    | 'AWAITING_STOCK'
    | 'AWAITING_DELIVERY_FEE'
    | 'CREATING';

interface SessionState {
    step: Step;
    parsedData?: ParsedBotProduct;
    imageUrl?: string;
    rawCaption?: string;
    stock?: number;
    deliveryFee?: number | null;
    linkOtpCode?: string; // temporary during link flow
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sessionExpiry(): Date {
    // Sessions expire after 30 minutes of inactivity
    const d = new Date();
    d.setMinutes(d.getMinutes() + 30);
    return d;
}

async function getOrCreateSession(phone: string): Promise<{ id: string; storeId: string | null; state: SessionState }> {
    let session = await prisma.botSession.findUnique({
        where: { platform_externalId: { platform: 'WHATSAPP', externalId: phone } },
    });

    if (!session) {
        // Try to auto-link by phone number match
        const store = await prisma.store.findFirst({
            where: { phoneNumber: phone, botEnabled: true },
            select: { id: true },
        });

        session = await prisma.botSession.create({
            data: {
                platform: 'WHATSAPP',
                externalId: phone,
                storeId: store?.id ?? null,
                state: { step: store ? 'IDLE' : 'UNLINKED' } as object,
                expiresAt: sessionExpiry(),
            },
        });
    } else {
        // Refresh expiry on activity
        await prisma.botSession.update({
            where: { id: session.id },
            data: { expiresAt: sessionExpiry() },
        });
    }

    return {
        id: session.id,
        storeId: session.storeId,
        state: session.state as SessionState,
    };
}

async function saveState(sessionId: string, state: SessionState) {
    await prisma.botSession.update({
        where: { id: sessionId },
        data: { state: state as object, expiresAt: sessionExpiry() },
    });
}

function formatProductConfirmation(p: ParsedBotProduct): string {
    const priceStr = p.price > 0 ? `₦${p.price.toLocaleString()}` : 'Not detected';
    const confidenceNote = p.confidence === 'low' ? ' ⚠️ (please confirm)' : '';

    return (
        `Here's what I found:\n\n` +
        `📦 *${p.title}*\n` +
        `💰 Price: ${priceStr}${confidenceNote}\n` +
        `📁 Category: ${p.category}\n` +
        `📝 ${p.description || '(no description)'}\n\n` +
        `Is this correct? Reply *YES* to continue, or tell me what to fix.`
    );
}

// ─── Main handler ────────────────────────────────────────────────────────────

export interface WhatsAppIncomingMessage {
    phone: string;                      // sender E.164 phone number
    messageType: 'text' | 'image' | 'interactive' | 'other';
    text?: string;
    imageId?: string;                   // WhatsApp media ID for image messages
    imageCaption?: string;
    interactiveReply?: string;          // button reply ID or title
}

export async function processWhatsAppMessage(msg: WhatsAppIncomingMessage): Promise<void> {
    const { phone, messageType, text, imageId, imageCaption, interactiveReply } = msg;

    const session = await getOrCreateSession(phone);
    const state = session.state;
    const replyText = (interactiveReply || text || '').trim().toUpperCase();

    // ── UNLINKED: Not connected to a store yet ────────────────────────────────
    if (state.step === 'UNLINKED') {
        if (replyText === '/LINK' || replyText === 'LINK') {
            // Find user by phone number (User.phoneNumber is encrypted so we use store.phoneNumber)
            const store = await prisma.store.findFirst({
                where: { phoneNumber: phone },
                select: { id: true, ownerId: true, name: true, botEnabled: true },
            });

            if (!store) {
                await sendText(
                    phone,
                    `I couldn't find a DepMi store linked to this number.\n\n` +
                    `To connect:\n1. Go to *depmi.com/store/[your-slug]/settings*\n` +
                    `2. Make sure your phone number is saved\n` +
                    `3. Enable the DepMi Bot\n4. Come back and send LINK`
                );
                return;
            }

            if (!store.botEnabled) {
                await sendText(
                    phone,
                    `The DepMi Bot is not enabled for *${store.name}*.\n\n` +
                    `Go to your Store Settings and enable it, then reply LINK again.`
                );
                return;
            }

            // Auto-link since phone matches
            await prisma.botSession.update({
                where: { id: session.id },
                data: {
                    storeId: store.id,
                    state: { step: 'IDLE' } as object,
                },
            });
            await prisma.store.update({
                where: { id: store.id },
                data: { whatsappLinked: true },
            });

            await sendText(
                phone,
                `✅ *${store.name}* is now connected to the DepMi Bot!\n\n` +
                `To list a product, just forward me a photo with the price and description. That's it.`
            );
            return;
        }

        await sendText(
            phone,
            `👋 Welcome to the DepMi Bot!\n\n` +
            `I help you list products on depmi.com automatically.\n\n` +
            `First, let's connect your store. Reply *LINK* to get started.`
        );
        return;
    }

    // ── AWAITING_LINK_OTP: (reserved for future OTP-based linking) ────────────
    if (state.step === 'AWAITING_LINK_OTP') {
        await sendText(phone, 'OTP linking coming soon. Please set your phone in Store Settings and reply LINK.');
        return;
    }

    // ── IDLE: Ready to receive a product post ────────────────────────────────
    if (state.step === 'IDLE') {
        if (messageType === 'image' && imageId) {
            await sendText(phone, '⏳ Got it! Analysing your product...');

            try {
                // Download image from WhatsApp CDN and re-upload to Cloudinary
                const mediaUrl = await getMediaUrl(imageId);
                const mediaBuffer = await downloadMedia(mediaUrl);

                // Convert ArrayBuffer to base64 data URL for Cloudinary upload
                const base64 = Buffer.from(mediaBuffer).toString('base64');
                const dataUrl = `data:image/jpeg;base64,${base64}`;
                const cloudinaryUrl = await uploadFromUrl(dataUrl);

                const caption = imageCaption || '';
                const parsed = await parseProductFromPost(cloudinaryUrl, caption);

                const newState: SessionState = {
                    step: 'AWAITING_CONFIRMATION',
                    parsedData: parsed,
                    imageUrl: cloudinaryUrl,
                    rawCaption: caption,
                };
                await saveState(session.id, newState);

                await sendButtons(
                    phone,
                    formatProductConfirmation(parsed),
                    ['YES, looks good', 'No, fix it']
                );
            } catch (err) {
                console.error('[bot/whatsapp] Image processing error:', err);
                await sendText(phone, 'Sorry, I had trouble reading that image. Please try again or forward a clearer photo.');
            }
            return;
        }

        if (messageType === 'text') {
            await sendText(
                phone,
                `To list a product, forward me a *photo* with the price and description in the caption.\n\n` +
                `I'll handle the rest! 📸`
            );
            return;
        }

        await sendText(phone, 'Please send a photo of your product with the price in the caption.');
        return;
    }

    // ── AWAITING_CONFIRMATION ────────────────────────────────────────────────
    if (state.step === 'AWAITING_CONFIRMATION') {
        const isYes = replyText === 'YES' || replyText === 'YES, LOOKS GOOD' || replyText === 'BTN_0';

        if (isYes) {
            await saveState(session.id, { ...state, step: 'AWAITING_STOCK' });
            await sendText(
                phone,
                `How many are you selling? Reply with a number.\n(Reply *1* if you only have one)`
            );
            return;
        }

        // User wants to correct something — re-parse with their correction as additional context
        const correctionText = text || '';
        if (correctionText) {
            await sendText(phone, '⏳ Let me try that again...');
            try {
                const reparsed = await parseProductFromPost(
                    state.imageUrl || null,
                    `${state.rawCaption || ''}\n\nCorrection: ${correctionText}`
                );
                const newState: SessionState = {
                    ...state,
                    parsedData: reparsed,
                };
                await saveState(session.id, newState);
                await sendButtons(
                    phone,
                    formatProductConfirmation(reparsed),
                    ['YES, looks good', 'No, fix it']
                );
            } catch {
                await sendText(phone, 'Sorry, I had trouble re-parsing. Please try again.');
            }
            return;
        }

        await sendText(phone, 'Reply *YES* to confirm, or tell me what needs to be fixed (e.g. "price is 5000").');
        return;
    }

    // ── AWAITING_STOCK ───────────────────────────────────────────────────────
    if (state.step === 'AWAITING_STOCK') {
        const stockNum = parseInt((text || '').replace(/\D/g, ''), 10);

        if (!isNaN(stockNum) && stockNum >= 0) {
            // Check if the store has delivery fees configured
            const store = session.storeId
                ? await prisma.store.findUnique({
                      where: { id: session.storeId },
                      select: { localDeliveryFee: true, nationwideDeliveryFee: true, storeState: true },
                  })
                : null;

            const hasStoreFees =
                store && (store.localDeliveryFee !== null || store.nationwideDeliveryFee !== null);

            if (hasStoreFees) {
                const localFee = store.localDeliveryFee ? `₦${Number(store.localDeliveryFee).toLocaleString()}` : 'N/A';
                const nationwideFee = store.nationwideDeliveryFee
                    ? `₦${Number(store.nationwideDeliveryFee).toLocaleString()}`
                    : 'N/A';

                const newState: SessionState = {
                    ...state,
                    step: 'AWAITING_DELIVERY_FEE',
                    stock: stockNum,
                    deliveryFee: null, // default to store fees
                };
                await saveState(session.id, newState);

                await sendButtons(
                    phone,
                    `Your store delivery rates:\n` +
                    `🏠 Local (${store.storeState || 'same state'}): ${localFee}\n` +
                    `🚚 Nationwide: ${nationwideFee}\n\n` +
                    `Use these for this listing? Or reply with a custom flat fee (e.g. *2500*).`,
                    ['YES, use store rates', 'Set custom fee']
                );
            } else {
                const newState: SessionState = {
                    ...state,
                    step: 'AWAITING_DELIVERY_FEE',
                    stock: stockNum,
                    deliveryFee: null,
                };
                await saveState(session.id, newState);

                await sendText(
                    phone,
                    `What delivery fee should buyers pay? Reply with a number in Naira.\n\n` +
                    `(Reply *0* for free delivery, or *SKIP* to set it later in your store settings)`
                );
            }
            return;
        }

        await sendText(phone, 'Please reply with a number (e.g. *5* or *1* if you only have one).');
        return;
    }

    // ── AWAITING_DELIVERY_FEE ────────────────────────────────────────────────
    if (state.step === 'AWAITING_DELIVERY_FEE') {
        let deliveryFee: number | null = null;

        const isYes = replyText === 'YES' || replyText === 'YES, USE STORE RATES' || replyText === 'BTN_0';
        const isSkip = replyText === 'SKIP';

        if (!isYes && !isSkip) {
            const feeNum = parseInt((text || '').replace(/\D/g, ''), 10);
            if (!isNaN(feeNum) && feeNum >= 0) {
                deliveryFee = feeNum;
            } else if (replyText !== 'SET CUSTOM FEE') {
                await sendText(phone, 'Reply with a delivery fee number (e.g. *2500*), or *YES* to use your store rates.');
                return;
            } else {
                // User tapped "Set custom fee" button — ask again
                await sendText(phone, 'What delivery fee? Reply with a number in Naira (e.g. *2500* or *0* for free).');
                return;
            }
        }
        // isYes or isSkip → deliveryFee stays null (inherit from store)

        await saveState(session.id, { ...state, step: 'CREATING', deliveryFee });
        await createProduct(phone, session, { ...state, step: 'CREATING', deliveryFee });
        return;
    }

    // ── CREATING: Shouldn't receive messages in this state ───────────────────
    await sendText(phone, '⏳ Still processing your listing... hang tight.');
}

// ─── Product creation ────────────────────────────────────────────────────────

async function createProduct(
    phone: string,
    session: { id: string; storeId: string | null },
    state: SessionState
): Promise<void> {
    if (!session.storeId || !state.parsedData) {
        await sendText(phone, 'Something went wrong. Please start over by sending your product photo again.');
        await saveState(session.id, { step: 'IDLE' });
        return;
    }

    try {
        const { product, storeSlug, slug } = await createProductFromBot({
            storeId: session.storeId,
            title: state.parsedData.title,
            description: state.parsedData.description,
            price: state.parsedData.price,
            category: state.parsedData.category as Category,
            images: state.imageUrl ? [state.imageUrl] : [],
            stock: state.stock ?? 1,
            deliveryFee: state.deliveryFee ?? null,
        });

        await saveState(session.id, { step: 'IDLE' });

        await sendText(
            phone,
            `✅ *${product.title || state.parsedData.title}* is now live on DepMi!\n\n` +
            `🔗 depmi.com/${storeSlug}\n\n` +
            `Forward another product photo to list more.`
        );
    } catch (err) {
        console.error('[bot/whatsapp] Product creation error:', err);
        await saveState(session.id, { step: 'IDLE' });
        await sendText(
            phone,
            `Sorry, something went wrong while listing your product. Please try again or go to depmi.com to list manually.`
        );
    }
}
