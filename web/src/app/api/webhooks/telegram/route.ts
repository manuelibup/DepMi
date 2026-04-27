import { NextRequest, NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import {
    sendTelegramMessage,
    sendTelegramMessageWithButtons,
    answerCallbackQuery,
    getTelegramFileUrl,
    setTelegramWebhook,
    TelegramUpdate,
    TelegramMessage,
} from '@/lib/bot/telegram';
import { prisma } from '@/lib/prisma';
import { uploadFromUrl } from '@/lib/bot/cloudinary';
import { parseProductFromPost } from '@/lib/bot/ai-parser';
import { createProductFromBot } from '@/lib/bot/shared';
import { Category } from '@prisma/client';

export const maxDuration = 60;

const BASE_URL = process.env.NEXTAUTH_URL || 'https://depmi.com';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ParsedTokenData {
    title: string;
    price: number;
    description: string;
    category: string;
    confidence: 'high' | 'medium' | 'low';
    isDigital: boolean;
    deliveryFee: number | null;
    variants: string;
}

type BotState =
    | { step: 'idle' }
    | { step: 'confirm'; tokenId: string }
    | { step: 'edit_name'; tokenId: string }
    | { step: 'edit_price'; tokenId: string }
    | { step: 'edit_description'; tokenId: string }
    | { step: 'edit_delivery'; tokenId: string }
    | { step: 'edit_variants'; tokenId: string };

// ─── Webhook endpoints ───────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
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

    waitUntil(processAsync(update));
    return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ ok: false }, { status: 401 });
    }

    const webhookUrl = `${BASE_URL}/api/webhooks/telegram${
        process.env.TELEGRAM_WEBHOOK_SECRET ? `?secret=${process.env.TELEGRAM_WEBHOOK_SECRET}` : ''
    }`;

    const ok = await setTelegramWebhook(webhookUrl);
    return NextResponse.json({ ok, webhookUrl });
}

// ─── Session helpers ─────────────────────────────────────────────────────────

async function getSession(chatId: number) {
    return prisma.botSession.findUnique({
        where: { platform_externalId: { platform: 'TELEGRAM', externalId: String(chatId) } },
    });
}

async function setSessionState(chatId: number, state: BotState) {
    await prisma.botSession.updateMany({
        where: { platform: 'TELEGRAM', externalId: String(chatId) },
        data: { state: state as object },
    });
}

// ─── Token helpers ───────────────────────────────────────────────────────────

async function getToken(tokenId: string) {
    const token = await prisma.botImportToken.findUnique({ where: { id: tokenId } });
    if (!token || token.used || token.expiresAt < new Date()) return null;
    return token;
}

async function updateTokenData(tokenId: string, data: ParsedTokenData) {
    await prisma.botImportToken.update({
        where: { id: tokenId },
        data: { parsedData: data as object },
    });
}

// ─── UI builders ─────────────────────────────────────────────────────────────

async function sendConfirmCard(chatId: number, tokenId: string, data: ParsedTokenData) {
    const cat = data.category
        ? data.category.charAt(0) + data.category.slice(1).toLowerCase()
        : 'Other';
    const type = data.isDigital ? '⚡ Digital' : '📦 Physical';
    const price = data.price > 0 ? `₦${data.price.toLocaleString()}` : '₦?';
    const lowConf = data.confidence === 'low' ? '\n⚠️ _Price may be wrong — please edit it_' : '';
    const variantLine = data.variants ? `\nVariants: _${data.variants}_` : '';
    const descLine = data.description
        ? `\n_${data.description.slice(0, 100)}${data.description.length > 100 ? '…' : ''}_`
        : '';

    await sendTelegramMessageWithButtons(
        chatId,
        `📦 *${data.title || 'Untitled product'}*\n${price} · ${cat} · ${type}${descLine}${variantLine}${lowConf}`,
        [
            [
                { text: '✅ Post it', callback_data: `post:${tokenId}` },
                { text: '✏️ Edit', callback_data: `edit:${tokenId}` },
                { text: '❌ Cancel', callback_data: `cancel:${tokenId}` },
            ],
        ]
    );
}

async function sendEditMenu(chatId: number, tokenId: string) {
    await sendTelegramMessageWithButtons(
        chatId,
        `✏️ *What would you like to change?*`,
        [
            [
                { text: '📝 Name', callback_data: `ename:${tokenId}` },
                { text: '💰 Price', callback_data: `eprice:${tokenId}` },
            ],
            [
                { text: '📄 Description', callback_data: `edesc:${tokenId}` },
                { text: '🏷 Category', callback_data: `ecat:${tokenId}` },
            ],
            [
                { text: '🚚 Delivery fee', callback_data: `edel:${tokenId}` },
                { text: '📦 Type', callback_data: `etype:${tokenId}` },
            ],
            [{ text: '✏️ Variants (sizes/colors)', callback_data: `evar:${tokenId}` }],
            [{ text: '← Back to review', callback_data: `back:${tokenId}` }],
        ]
    );
}

const CATEGORIES: Category[] = [
    'FASHION', 'GADGETS', 'BEAUTY', 'COSMETICS', 'FOOD',
    'FURNITURE', 'VEHICLES', 'SERVICES', 'TRANSPORT',
    'SPORT', 'HOUSING', 'BOOKS', 'COURSE', 'OTHER',
];

async function sendCategoryButtons(chatId: number, tokenId: string) {
    const rows: { text: string; callback_data: string }[][] = [];
    for (let i = 0; i < CATEGORIES.length; i += 3) {
        rows.push(
            CATEGORIES.slice(i, i + 3).map(c => ({
                text: c.charAt(0) + c.slice(1).toLowerCase(),
                callback_data: `cat:${c}:${tokenId}`,
            }))
        );
    }
    rows.push([{ text: '← Back', callback_data: `edit:${tokenId}` }]);
    await sendTelegramMessageWithButtons(chatId, `🏷 *Select a category:*`, rows);
}

async function sendTypeButtons(chatId: number, tokenId: string) {
    await sendTelegramMessageWithButtons(
        chatId,
        `📦 *What type of product is this?*`,
        [
            [
                { text: '📦 Physical', callback_data: `typ:P:${tokenId}` },
                { text: '⚡ Digital', callback_data: `typ:D:${tokenId}` },
            ],
            [{ text: '← Back', callback_data: `edit:${tokenId}` }],
        ]
    );
}

// ─── Command handlers ─────────────────────────────────────────────────────────

async function handleConnectCommand(chatId: number, hasSession: boolean) {
    if (hasSession) {
        const session = await getSession(chatId);
        const store = session?.storeId
            ? await prisma.store.findUnique({ where: { id: session.storeId }, select: { name: true } })
            : null;
        await sendTelegramMessageWithButtons(
            chatId,
            `✅ Already connected${store ? ` to *${store.name}*` : ''}.\n\nSend a product photo to list it, or disconnect:`,
            [[{ text: '🔌 Disconnect', callback_data: 'disconnect' }]]
        );
        return;
    }

    const token = await prisma.botConnectToken.create({
        data: {
            chatId: String(chatId),
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
    });

    await sendTelegramMessageWithButtons(
        chatId,
        `🔗 *Connect your DepMi seller account*\n\nTap below to link your account. The link expires in 10 minutes.`,
        [[{ text: '🔗 Connect now', url: `${BASE_URL}/bot/connect?token=${token.id}` }]]
    );
}

async function handleDisconnectCommand(chatId: number) {
    const deleted = await prisma.botSession.deleteMany({
        where: { platform: 'TELEGRAM', externalId: String(chatId) },
    });
    if (deleted.count > 0) {
        await sendTelegramMessage(chatId, `🔌 Disconnected. Send /connect to link again.`);
    } else {
        await sendTelegramMessage(chatId, `You weren't connected. Send /connect to link your DepMi account.`);
    }
}

async function handleHelpCommand(chatId: number, connected: boolean) {
    if (connected) {
        await sendTelegramMessageWithButtons(
            chatId,
            `👋 *DepMi Bot*\n\n` +
            `You're connected! Here's what you can do:\n\n` +
            `📸 *Send a photo* → list a product\n` +
            `/products — view your recent listings\n` +
            `/orders — view pending orders\n` +
            `/disconnect — unlink this account`,
            [[{ text: '🛍 Browse DepMi', url: 'https://depmi.com' }]]
        );
    } else {
        await sendTelegramMessageWithButtons(
            chatId,
            `👋 *Welcome to DepMi Bot!*\n\n` +
            `List products on DepMi straight from Telegram — no browser needed.\n\n` +
            `*Get started:*\n` +
            `1. Send /connect to link your seller account\n` +
            `2. Send a photo of your product\n` +
            `3. Review the AI-parsed details\n` +
            `4. Tap ✅ — it's live!`,
            [
                [{ text: '🛍 Browse DepMi', url: 'https://depmi.com' }],
                [{ text: '🔗 Connect my account', callback_data: 'do_connect' }],
            ]
        );
    }
}

async function handleProductsCommand(chatId: number, storeId: string) {
    const [products, store] = await Promise.all([
        prisma.product.findMany({
            where: { storeId },
            orderBy: { createdAt: 'desc' },
            take: 7,
            select: { title: true, price: true, inStock: true, slug: true },
        }),
        prisma.store.findUnique({ where: { id: storeId }, select: { slug: true } }),
    ]);

    if (products.length === 0) {
        await sendTelegramMessage(chatId, `You have no listings yet.\n\nSend a product photo to create your first one!`);
        return;
    }

    const list = products.map((p, i) =>
        `${i + 1}. *${p.title}* — ₦${Number(p.price).toLocaleString()} ${p.inStock ? '✅' : '❌ sold out'}`
    ).join('\n');

    await sendTelegramMessageWithButtons(
        chatId,
        `📦 *Your listings:*\n\n${list}`,
        [[{ text: 'View all on DepMi', url: `https://depmi.com/${store?.slug || ''}` }]]
    );
}

async function handleOrdersCommand(chatId: number, storeId: string) {
    const orders = await prisma.order.findMany({
        where: { sellerId: storeId, status: { in: ['CONFIRMED', 'PENDING'] } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
            id: true,
            status: true,
            totalAmount: true,
            items: { take: 1, select: { product: { select: { title: true } } } },
        },
    });

    if (orders.length === 0) {
        await sendTelegramMessage(chatId, `No pending orders right now.`);
        return;
    }

    const list = orders.map(o =>
        `• #${o.id.slice(-6).toUpperCase()} — *${o.items[0]?.product?.title || 'Product'}*\n  ₦${Number(o.totalAmount).toLocaleString()} · ${o.status}`
    ).join('\n\n');

    await sendTelegramMessageWithButtons(
        chatId,
        `📋 *Pending orders:*\n\n${list}`,
        [[{ text: 'Manage orders', url: 'https://depmi.com/orders' }]]
    );
}

// ─── Photo handler ────────────────────────────────────────────────────────────

async function handlePhotoMessage(chatId: number, message: TelegramMessage, caption: string, storeId: string) {
    await sendTelegramMessage(chatId, `⏳ Processing your photo…`);

    const fileId = message.photo
        ? message.photo[message.photo.length - 1].file_id
        : message.document!.file_id;

    let telegramUrl: string | null = null;
    try {
        telegramUrl = await getTelegramFileUrl(fileId);
    } catch (err) {
        console.error('[telegram-webhook] getTelegramFileUrl failed:', err);
    }

    const [cloudinaryUrl, parsed] = await Promise.all([
        telegramUrl ? uploadFromUrl(telegramUrl).catch(() => null) : Promise.resolve(null),
        parseProductFromPost(telegramUrl, caption).catch(() => null),
    ]);

    const data: ParsedTokenData = {
        title: parsed?.title || '',
        price: parsed?.price || 0,
        description: parsed?.description || caption.substring(0, 500),
        category: parsed?.category || 'OTHER',
        confidence: parsed?.confidence || 'low',
        isDigital: false,
        deliveryFee: null,
        variants: '',
    };

    const token = await prisma.botImportToken.create({
        data: {
            platform: 'TELEGRAM',
            postId: String(message.message_id),
            storeId,
            parsedData: data as object,
            imageUrls: cloudinaryUrl ? [cloudinaryUrl] : [],
            expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        },
    });

    await setSessionState(chatId, { step: 'confirm', tokenId: token.id });
    await sendConfirmCard(chatId, token.id, data);
}

// ─── State machine: text replies during edit flow ─────────────────────────────

async function handleStateMessage(chatId: number, text: string, state: BotState) {
    if (state.step === 'idle' || state.step === 'confirm') return false;

    const { tokenId } = state;
    const token = await getToken(tokenId);
    if (!token) {
        await setSessionState(chatId, { step: 'idle' });
        await sendTelegramMessage(chatId, `⚠️ That listing expired. Send a new photo to start again.`);
        return true;
    }

    const data = token.parsedData as unknown as ParsedTokenData;

    switch (state.step) {
        case 'edit_name':
            if (!text.trim()) {
                await sendTelegramMessage(chatId, `Please enter a product name:`);
                return true;
            }
            data.title = text.trim().substring(0, 100);
            break;

        case 'edit_price': {
            const num = parseInt(text.replace(/[^0-9]/g, ''), 10);
            if (isNaN(num) || num < 0) {
                await sendTelegramMessage(chatId, `❌ Enter a valid price in ₦ (e.g. 5000):`);
                return true;
            }
            data.price = num;
            data.confidence = 'high';
            break;
        }

        case 'edit_description':
            data.description = text.trim().substring(0, 500);
            break;

        case 'edit_delivery': {
            if (text.toLowerCase() === 'free' || text.trim() === '0') {
                data.deliveryFee = 0;
            } else {
                const num = parseInt(text.replace(/[^0-9]/g, ''), 10);
                if (isNaN(num) || num < 0) {
                    await sendTelegramMessage(chatId, `❌ Enter a ₦ amount or type "free":`);
                    return true;
                }
                data.deliveryFee = num;
            }
            break;
        }

        case 'edit_variants':
            data.variants = text.trim().substring(0, 300);
            break;

        default:
            return false;
    }

    await updateTokenData(tokenId, data);
    await setSessionState(chatId, { step: 'confirm', tokenId });
    await sendConfirmCard(chatId, tokenId, data);
    return true;
}

// ─── Callback query handler ───────────────────────────────────────────────────

async function handleCallbackQuery(query: NonNullable<TelegramUpdate['callback_query']>) {
    const { id, from, data, message } = query;
    await answerCallbackQuery(id);

    const chatId = message?.chat.id ?? from.id;
    const session = await getSession(chatId);

    if (!data) return;

    const parts = data.split(':');
    const action = parts[0];
    const tokenId = parts.slice(action === 'cat' || action === 'typ' ? 2 : 1).join(':');
    const param = action === 'cat' || action === 'typ' ? parts[1] : undefined;

    switch (action) {
        case 'do_connect':
            await handleConnectCommand(chatId, !!session);
            break;

        case 'disconnect':
            await handleDisconnectCommand(chatId);
            break;

        case 'post': {
            const token = await getToken(tokenId);
            if (!token || !token.storeId) {
                await sendTelegramMessage(chatId, `⚠️ Listing expired. Send a new photo.`);
                return;
            }
            await prisma.botImportToken.update({ where: { id: tokenId }, data: { used: true } });
            await setSessionState(chatId, { step: 'idle' });

            const pdata = token.parsedData as unknown as ParsedTokenData;
            try {
                const { slug } = await createProductFromBot({
                    storeId: token.storeId,
                    title: pdata.title || 'Product',
                    description: pdata.description || undefined,
                    price: pdata.price || 0,
                    category: (CATEGORIES.includes(pdata.category as Category) ? pdata.category : 'OTHER') as Category,
                    images: token.imageUrls,
                    stock: 1,
                    deliveryFee: pdata.deliveryFee ?? null,
                    isDigital: pdata.isDigital || false,
                    variants: pdata.variants || '',
                });
                await sendTelegramMessageWithButtons(
                    chatId,
                    `✅ *${pdata.title}* is now live on DepMi!\n₦${(pdata.price || 0).toLocaleString()}`,
                    [[{ text: '🔗 View listing', url: `https://depmi.com/p/${slug}` }]]
                );
            } catch (err) {
                console.error('[telegram-webhook] createProductFromBot error:', err);
                await sendTelegramMessage(chatId, `⚠️ Failed to create listing. Please try again.`);
            }
            break;
        }

        case 'cancel': {
            const token = await prisma.botImportToken.findUnique({ where: { id: tokenId } });
            if (token && !token.used) {
                await prisma.botImportToken.update({ where: { id: tokenId }, data: { used: true } });
            }
            await setSessionState(chatId, { step: 'idle' });
            await sendTelegramMessage(chatId, `❌ Listing cancelled. Send a new photo whenever you're ready.`);
            break;
        }

        case 'edit':
            await sendEditMenu(chatId, tokenId);
            break;

        case 'back': {
            const token = await getToken(tokenId);
            if (!token) {
                await sendTelegramMessage(chatId, `⚠️ Listing expired. Send a new photo.`);
                return;
            }
            await setSessionState(chatId, { step: 'confirm', tokenId });
            await sendConfirmCard(chatId, tokenId, token.parsedData as unknown as ParsedTokenData);
            break;
        }

        case 'ename':
            if (session) await setSessionState(chatId, { step: 'edit_name', tokenId });
            await sendTelegramMessage(chatId, `📝 Send the new *product name*:`);
            break;

        case 'eprice':
            if (session) await setSessionState(chatId, { step: 'edit_price', tokenId });
            await sendTelegramMessage(chatId, `💰 Send the new *price* in ₦ (e.g. 5000):`);
            break;

        case 'edesc':
            if (session) await setSessionState(chatId, { step: 'edit_description', tokenId });
            await sendTelegramMessage(chatId, `📄 Send the *description* (max 500 chars):`);
            break;

        case 'edel':
            if (session) await setSessionState(chatId, { step: 'edit_delivery', tokenId });
            await sendTelegramMessage(chatId, `🚚 Send the *delivery fee* in ₦, or type "free":`);
            break;

        case 'evar':
            if (session) await setSessionState(chatId, { step: 'edit_variants', tokenId });
            await sendTelegramMessage(chatId, `✏️ Send the *variants* (e.g. "Red/S, Red/M, Blue/L"):`);
            break;

        case 'ecat':
            await sendCategoryButtons(chatId, tokenId);
            break;

        case 'etype':
            await sendTypeButtons(chatId, tokenId);
            break;

        case 'cat': {
            const token = await getToken(tokenId);
            if (!token || !param) return;
            const data = token.parsedData as unknown as ParsedTokenData;
            data.category = CATEGORIES.includes(param as Category) ? param : 'OTHER';
            await updateTokenData(tokenId, data);
            await setSessionState(chatId, { step: 'confirm', tokenId });
            await sendConfirmCard(chatId, tokenId, data);
            break;
        }

        case 'typ': {
            const token = await getToken(tokenId);
            if (!token || !param) return;
            const data = token.parsedData as unknown as ParsedTokenData;
            data.isDigital = param === 'D';
            if (data.isDigital) data.deliveryFee = 0;
            await updateTokenData(tokenId, data);
            await setSessionState(chatId, { step: 'confirm', tokenId });
            await sendConfirmCard(chatId, tokenId, data);
            break;
        }

        case 'how_to_list':
            await sendTelegramMessage(
                chatId,
                `📸 *Send me a product photo!*\n\nInclude the price in the caption, e.g:\n_"Red Ankara bag 5500"_\n_"iPhone 13 Pro — ₦380k"_\n\nI'll do the rest.`
            );
            break;
    }
}

// ─── Main dispatcher ─────────────────────────────────────────────────────────

async function processAsync(update: TelegramUpdate): Promise<void> {
    try {
        if (update.callback_query) {
            await handleCallbackQuery(update.callback_query);
            return;
        }

        const message = update.message || update.channel_post;
        if (!message) return;

        const chatId = message.chat.id;
        const text = message.text?.trim() ?? '';
        const caption = message.caption || '';

        const session = await getSession(chatId);
        const connected = !!session?.storeId;

        // Commands
        if (text.startsWith('/connect')) {
            await handleConnectCommand(chatId, connected);
            return;
        }
        if (text.startsWith('/disconnect')) {
            await handleDisconnectCommand(chatId);
            return;
        }
        if (text.startsWith('/start') || text.startsWith('/help')) {
            await handleHelpCommand(chatId, connected);
            return;
        }
        if (text.startsWith('/products') && connected && session?.storeId) {
            await handleProductsCommand(chatId, session.storeId);
            return;
        }
        if (text.startsWith('/orders') && connected && session?.storeId) {
            await handleOrdersCommand(chatId, session.storeId);
            return;
        }

        // Photo or image document
        const hasPhoto = message.photo && message.photo.length > 0;
        const hasImageDoc = message.document?.mime_type?.startsWith('image/');
        if (hasPhoto || hasImageDoc) {
            if (!connected || !session?.storeId) {
                await sendTelegramMessageWithButtons(
                    chatId,
                    `Link your DepMi seller account first to list products from Telegram.`,
                    [[{ text: '🔗 Connect now', callback_data: 'do_connect' }]]
                );
                return;
            }
            // New photo cancels any active edit state
            await handlePhotoMessage(chatId, message, caption, session.storeId);
            return;
        }

        // Text message — check edit state machine
        if (session && text) {
            const state = (session.state as unknown as BotState) ?? { step: 'idle' };
            const handled = await handleStateMessage(chatId, text, state);
            if (handled) return;
        }

        // Default responses
        if (!connected) {
            await sendTelegramMessageWithButtons(
                chatId,
                `👋 Send /connect to link your DepMi seller account, then send product photos to list instantly.`,
                [[{ text: '🔗 Connect', callback_data: 'do_connect' }]]
            );
        } else {
            await sendTelegramMessage(chatId, `Send a *photo* of your product to list it.\n\nUse /help to see all commands.`);
        }
    } catch (err) {
        console.error('[telegram-webhook] Error:', err);
        try {
            const message = update.message || update.channel_post;
            if (message?.chat?.id) {
                await sendTelegramMessage(
                    message.chat.id,
                    `⚠️ Something went wrong. Please try again in a moment.`
                );
            }
        } catch {
            // ignore
        }
    }
}
