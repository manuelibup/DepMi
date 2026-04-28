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
import {
    BotSettingsState,
    sendSettingsMenu,
    handleSettingsState,
    handlePayoutState,
    handlePayoutConfirmCallback,
    handleDispatchToggle,
} from '@/lib/bot/store-settings';
import {
    BuyerState,
    handleBuyerDeepLink,
    handleBuyStart,
    handleBuyerState,
    handleBuyerConfirm,
} from '@/lib/bot/buyer';

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
    | { step: 'edit_variants'; tokenId: string }
    | { step: 'live_edit_name'; productId: string }
    | { step: 'live_edit_price'; productId: string }
    | { step: 'live_edit_description'; productId: string }
    | { step: 'live_edit_stock'; productId: string }
    | { step: 'live_edit_variants'; productId: string }
    | { step: 'waiting_feedback' }
    | BotSettingsState
    | BuyerState;

const ADMIN_CHAT_ID = process.env.ADMIN_TELEGRAM_CHAT_ID ?? '';

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

async function setSessionState(chatId: number, state: object) {
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
            [{ text: '🔖 Variants (sizes/colors)', callback_data: `evar:${tokenId}` }],
            [{ text: '← Back to review', callback_data: `back:${tokenId}` }],
        ]
    );
}

async function sendLiveEditMenu(chatId: number, productId: string) {
    const product = await prisma.product.findUnique({
        where: { id: productId },
        select: {
            title: true,
            price: true,
            inStock: true,
            stock: true,
            _count: { select: { variants: true } },
        },
    });
    if (!product) {
        await sendTelegramMessage(chatId, `⚠️ Product not found.`);
        return;
    }

    const status = product.inStock ? '✅ In stock' : '❌ Sold out';
    const variantLabel = product._count.variants > 0
        ? `🔖 Variants (${product._count.variants})`
        : '🔖 Add variants';

    await sendTelegramMessageWithButtons(
        chatId,
        `✏️ *Editing: ${product.title}*\n₦${Number(product.price).toLocaleString()} · ${status} · ${product.stock} qty`,
        [
            [
                { text: '📝 Name', callback_data: `lpname:${productId}` },
                { text: '💰 Price', callback_data: `lpprice:${productId}` },
            ],
            [
                { text: '📄 Description', callback_data: `lpdesc:${productId}` },
                { text: '📦 Qty in stock', callback_data: `lpstock:${productId}` },
            ],
            [{ text: variantLabel, callback_data: `lpvar:${productId}` }],
            [{ text: product.inStock ? '❌ Mark as sold out' : '✅ Mark as in stock', callback_data: `lpstatus:${productId}` }],
            [{ text: '← My listings', callback_data: 'products' }],
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

// ─── Variant string parser (shared by pre-listing and live edits) ─────────────
// Format: "Name, Name" (uses base price) or "Name:Price, Name:Price" (custom per-variant price)

function parseVariantString(text: string, basePrice: number): { name: string; price: number; stock: number }[] {
    return text
        .split(',')
        .map(v => {
            const colonIdx = v.lastIndexOf(':');
            const hasPrice = colonIdx > 0 && /\d/.test(v.slice(colonIdx + 1));
            const namePart = hasPrice ? v.slice(0, colonIdx).trim() : v.trim();
            const pricePart = hasPrice ? parseInt(v.slice(colonIdx + 1).replace(/[^0-9]/g, ''), 10) : NaN;
            return {
                name: namePart.substring(0, 80),
                price: !isNaN(pricePart) && pricePart > 0 ? pricePart : basePrice,
                stock: 1,
            };
        })
        .filter(v => v.name.length > 0);
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
            `/products — view & edit your listings\n` +
            `/orders — view pending orders\n` +
            `/settings — store settings & delivery fees\n` +
            `/payout — manage payout account\n` +
            `/feedback — send a complaint or suggestion\n` +
            `/disconnect — unlink this account`,
            [
                [{ text: '🛍 Browse DepMi', url: 'https://depmi.com' }],
                [
                    { text: '⚙️ Settings', callback_data: 'storet' },
                    { text: '📩 Feedback', callback_data: 'feedback' },
                ],
            ]
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
            select: { id: true, title: true, price: true, inStock: true, slug: true },
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

    // Edit buttons — 3 per row, maps number label to product ID
    const editRows: { text: string; callback_data: string }[][] = [];
    for (let i = 0; i < products.length; i += 3) {
        editRows.push(
            products.slice(i, i + 3).map((p, j) => ({
                text: `✏️ #${i + j + 1}`,
                callback_data: `lp:${p.id}`,
            }))
        );
    }

    await sendTelegramMessageWithButtons(
        chatId,
        `📦 *Your listings:*\n\n${list}\n\nTap ✏️ to edit any listing:`,
        [
            ...editRows,
            [{ text: 'View all on DepMi', url: `https://depmi.com/${store?.slug || ''}` }],
        ]
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

async function handleAdminCommand(chatId: number, fullText: string) {
    const isOwner = ADMIN_CHAT_ID && String(chatId) === ADMIN_CHAT_ID;
    if (!isOwner) {
        await sendTelegramMessage(chatId, `🔒 Admin only.`, 'none');
        return;
    }

    // Parse subcommand: /admin <sub> <arg>
    const parts = fullText.trim().split(/\s+/);
    const sub = parts[1]?.toLowerCase();

    // ── /admin ban <username> ──────────────────────────────────────────────
    if (sub === 'ban') {
        const username = parts[2]?.replace('@', '');
        if (!username) { await sendTelegramMessage(chatId, `Usage: /admin ban @username`, 'none'); return; }
        const user = await prisma.user.findUnique({ where: { username }, select: { id: true, displayName: true, isBanned: true } });
        if (!user) { await sendTelegramMessage(chatId, `❌ User @${username} not found.`, 'none'); return; }
        await prisma.user.update({ where: { id: user.id }, data: { isBanned: true } });
        await prisma.notification.create({ data: { userId: user.id, type: 'SYSTEM', title: 'Account suspended', body: 'Your account has been suspended by DepMi admin. Contact support@depmi.com to appeal.', link: '/help' } });
        await sendTelegramMessage(chatId, `✅ @${username} (${user.displayName}) has been <b>banned</b>.`, 'HTML');
        return;
    }

    // ── /admin unban <username> ────────────────────────────────────────────
    if (sub === 'unban') {
        const username = parts[2]?.replace('@', '');
        if (!username) { await sendTelegramMessage(chatId, `Usage: /admin unban @username`, 'none'); return; }
        const user = await prisma.user.findUnique({ where: { username }, select: { id: true, displayName: true } });
        if (!user) { await sendTelegramMessage(chatId, `❌ User @${username} not found.`, 'none'); return; }
        await prisma.user.update({ where: { id: user.id }, data: { isBanned: false } });
        await prisma.notification.create({ data: { userId: user.id, type: 'SYSTEM', title: 'Account reinstated', body: 'Your account has been reinstated. Welcome back to DepMi.', link: '/' } });
        await sendTelegramMessage(chatId, `✅ @${username} (${user.displayName}) has been <b>unbanned</b>.`, 'HTML');
        return;
    }

    // ── /admin clearstrikes <username> ────────────────────────────────────
    if (sub === 'clearstrikes') {
        const username = parts[2]?.replace('@', '');
        if (!username) { await sendTelegramMessage(chatId, `Usage: /admin clearstrikes @username`, 'none'); return; }
        const user = await prisma.user.findUnique({ where: { username }, select: { id: true, displayName: true, strikeCount: true } });
        if (!user) { await sendTelegramMessage(chatId, `❌ User @${username} not found.`, 'none'); return; }
        await prisma.$transaction([
            prisma.strike.deleteMany({ where: { userId: user.id } }),
            prisma.user.update({ where: { id: user.id }, data: { strikeCount: 0, isBanned: false } }),
        ]);
        await prisma.notification.create({ data: { userId: user.id, type: 'SYSTEM', title: 'Strikes cleared', body: 'Your account strikes have been cleared by DepMi admin.', link: '/' } });
        await sendTelegramMessage(chatId, `✅ Cleared <b>${user.strikeCount}</b> strike(s) for @${username} (${user.displayName}).`, 'HTML');
        return;
    }

    // ── /admin deletepost <postId> [strike] ───────────────────────────────
    if (sub === 'deletepost') {
        const postId = parts[2];
        const withStrike = parts[3] === 'strike';
        if (!postId) { await sendTelegramMessage(chatId, `Usage: /admin deletepost <postId> [strike]`, 'none'); return; }
        const post = await prisma.post.findUnique({ where: { id: postId }, select: { id: true, authorId: true, body: true } });
        if (!post) { await sendTelegramMessage(chatId, `❌ Post not found.`, 'none'); return; }
        await prisma.post.delete({ where: { id: postId } });
        if (withStrike) {
            const STRIKE_LIMIT = 5;
            const [, updated] = await prisma.$transaction([
                prisma.strike.create({ data: { userId: post.authorId, reason: 'external link', context: `Post deleted by admin` } }),
                prisma.user.update({ where: { id: post.authorId }, data: { strikeCount: { increment: 1 } }, select: { strikeCount: true } }),
            ]);
            const newCount = updated.strikeCount;
            if (newCount >= STRIKE_LIMIT) {
                await prisma.user.update({ where: { id: post.authorId }, data: { isBanned: true } });
                await prisma.notification.create({ data: { userId: post.authorId, type: 'SYSTEM', title: 'Account suspended', body: 'Suspended for repeated community guidelines violations.', link: '/help' } });
            } else {
                await prisma.notification.create({ data: { userId: post.authorId, type: 'SYSTEM', title: `Strike ${newCount} of ${STRIKE_LIMIT} — Post removed`, body: `Your post was removed for containing an external link. ${STRIKE_LIMIT - newCount} more violation(s) will result in suspension.`, link: '/help' } });
            }
        }
        await sendTelegramMessage(chatId, `✅ Post deleted${withStrike ? ' + strike issued' : ''}.`, 'none');
        return;
    }

    // ── /admin deletedemand <demandId> [strike] ───────────────────────────
    if (sub === 'deletedemand') {
        const demandId = parts[2];
        const withStrike = parts[3] === 'strike';
        if (!demandId) { await sendTelegramMessage(chatId, `Usage: /admin deletedemand <demandId> [strike]`, 'none'); return; }
        const demand = await prisma.demand.findUnique({ where: { id: demandId }, select: { id: true, userId: true } });
        if (!demand) { await sendTelegramMessage(chatId, `❌ Demand not found.`, 'none'); return; }
        await prisma.demand.update({ where: { id: demandId }, data: { isActive: false } });
        if (withStrike) {
            const STRIKE_LIMIT = 5;
            const [, updated] = await prisma.$transaction([
                prisma.strike.create({ data: { userId: demand.userId, reason: 'external link', context: `Demand removed by admin` } }),
                prisma.user.update({ where: { id: demand.userId }, data: { strikeCount: { increment: 1 } }, select: { strikeCount: true } }),
            ]);
            const newCount = updated.strikeCount;
            if (newCount >= STRIKE_LIMIT) {
                await prisma.user.update({ where: { id: demand.userId }, data: { isBanned: true } });
                await prisma.notification.create({ data: { userId: demand.userId, type: 'SYSTEM', title: 'Account suspended', body: 'Suspended for repeated community guidelines violations.', link: '/help' } });
            } else {
                await prisma.notification.create({ data: { userId: demand.userId, type: 'SYSTEM', title: `Strike ${newCount} of ${STRIKE_LIMIT} — Request removed`, body: `Your request was removed for containing an external link. ${STRIKE_LIMIT - newCount} more violation(s) will result in suspension.`, link: '/help' } });
            }
        }
        await sendTelegramMessage(chatId, `✅ Request removed${withStrike ? ' + strike issued' : ''}.`, 'none');
        return;
    }

    // ── /admin approvelink <domain> ───────────────────────────────────────
    if (sub === 'approvelink') {
        const domain = parts[2];
        if (!domain) { await sendTelegramMessage(chatId, `Usage: /admin approvelink <domain>`, 'none'); return; }
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const result = await (prisma as any).approvedLink.updateMany({ where: { domain }, data: { status: 'APPROVED' } });
            if (result.count === 0) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await (prisma as any).approvedLink.create({ data: { url: `https://${domain}`, domain, submittedBy: null as unknown as string, status: 'APPROVED' } }).catch(() => {});
            }
            // Notify original submitter
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const link = await (prisma as any).approvedLink.findFirst({ where: { domain } });
            if (link?.submittedBy) {
                await prisma.notification.create({ data: { userId: link.submittedBy, type: 'SYSTEM', title: `Link approved: ${domain}`, body: `Your link submission for ${domain} has been approved. Anyone can now post links from this domain on DepMi.`, link: '/links' } });
            }
        } catch { /* table may not exist yet */ }
        await sendTelegramMessage(chatId, `✅ <b>${domain}</b> is now <b>approved</b>. Anyone can post links from it.`, 'HTML');
        return;
    }

    // ── /admin rejectlink <domain> ────────────────────────────────────────
    if (sub === 'rejectlink') {
        const domain = parts[2];
        if (!domain) { await sendTelegramMessage(chatId, `Usage: /admin rejectlink <domain>`, 'none'); return; }
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const result = await (prisma as any).approvedLink.updateMany({ where: { domain }, data: { status: 'REJECTED' } });
            if (result.count === 0) { await sendTelegramMessage(chatId, `❌ Domain ${domain} not found in submissions.`, 'none'); return; }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const link = await (prisma as any).approvedLink.findFirst({ where: { domain } });
            if (link?.submittedBy) {
                await prisma.notification.create({ data: { userId: link.submittedBy, type: 'SYSTEM', title: `Link rejected: ${domain}`, body: `Your link submission for ${domain} was not approved. External links from this domain are not permitted on DepMi.`, link: '/links' } });
            }
        } catch { /* table may not exist yet */ }
        await sendTelegramMessage(chatId, `❌ <b>${domain}</b> has been <b>rejected</b>.`, 'HTML');
        return;
    }

    // ── /admin userstats <username> ───────────────────────────────────────
    if (sub === 'userstats') {
        const username = parts[2]?.replace('@', '');
        if (!username) { await sendTelegramMessage(chatId, `Usage: /admin userstats @username`, 'none'); return; }
        const user = await prisma.user.findUnique({
            where: { username },
            select: { id: true, displayName: true, isBanned: true, strikeCount: true, adminRole: true, createdAt: true, _count: { select: { ordersAsBuyer: true, stores: true } } },
        });
        if (!user) { await sendTelegramMessage(chatId, `❌ User @${username} not found.`, 'none'); return; }
        await sendTelegramMessage(
            chatId,
            `👤 <b>${escapeHtmlLocal(user.displayName)}</b> (@${username})\n` +
            `Banned: ${user.isBanned ? '🚫 Yes' : '✅ No'}\n` +
            `Strikes: ${user.strikeCount}/5\n` +
            `Role: ${user.adminRole ?? 'User'}\n` +
            `Stores: ${user._count.stores}\n` +
            `Orders placed: ${user._count.ordersAsBuyer}\n` +
            `Joined: ${user.createdAt.toDateString()}`,
            'HTML'
        );
        return;
    }

    // ── /admin (no subcommand) → stats ────────────────────────────────────
    const [connectedSellers, productsViaBot, recentSellers, totalUsers, totalStores] = await Promise.all([
        prisma.botSession.count({ where: { platform: 'TELEGRAM', storeId: { not: null } } }),
        prisma.botImportToken.count({ where: { platform: 'TELEGRAM', used: true } }),
        prisma.botSession.findMany({
            where: { platform: 'TELEGRAM', storeId: { not: null } },
            orderBy: { id: 'desc' },
            take: 5,
            include: { store: { select: { name: true, slug: true } } },
        }),
        prisma.user.count(),
        prisma.store.count(),
    ]);

    const storeList = recentSellers
        .map(s => `• ${s.store?.name ?? 'Unknown'} (depmi.com/${s.store?.slug ?? ''})`)
        .join('\n');

    await sendTelegramMessage(
        chatId,
        `📊 <b>DepMi Admin Panel</b>\n\n` +
        `👥 Total users: <b>${totalUsers}</b>\n` +
        `🏪 Total stores: <b>${totalStores}</b>\n` +
        `🤖 Bot-connected sellers: <b>${connectedSellers}</b>\n` +
        `📦 Products via bot: <b>${productsViaBot}</b>\n\n` +
        `<b>Recent bot sellers:</b>\n${storeList || 'None yet'}\n\n` +
        `<b>Commands:</b>\n` +
        `/admin ban @user\n` +
        `/admin unban @user\n` +
        `/admin clearstrikes @user\n` +
        `/admin userstats @user\n` +
        `/admin deletepost &lt;postId&gt; [strike]\n` +
        `/admin deletedemand &lt;demandId&gt; [strike]\n` +
        `/admin approvelink &lt;domain&gt;\n` +
        `/admin rejectlink &lt;domain&gt;`,
        'HTML'
    );
}

async function forwardFeedbackToAdmin(chatId: number, text: string, session: { store?: { name?: string | null } | null } | null) {
    if (!ADMIN_CHAT_ID) return;
    const storeName = (session as { store?: { name?: string } | null } | null)?.store?.name ?? 'Unknown store';
    await sendTelegramMessage(
        ADMIN_CHAT_ID,
        `📩 <b>Feedback from ${escapeHtmlLocal(storeName)}</b> (chat ${chatId})\n\n${escapeHtmlLocal(text)}`,
        'HTML'
    ).catch(() => {});
}

function escapeHtmlLocal(s: string) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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

// ─── State machine: live product edits ───────────────────────────────────────

async function handleLiveStateMessage(
    chatId: number,
    text: string,
    state: Extract<BotState, { productId: string }>
): Promise<boolean> {
    const { productId } = state;

    const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { price: true },
    });
    if (!product) {
        await setSessionState(chatId, { step: 'idle' });
        await sendTelegramMessage(chatId, `⚠️ Product not found.`);
        return true;
    }

    switch (state.step) {
        case 'live_edit_name': {
            if (!text.trim()) {
                await sendTelegramMessage(chatId, `Please enter a product name:`);
                return true;
            }
            await prisma.product.update({ where: { id: productId }, data: { title: text.trim().substring(0, 100) } });
            break;
        }
        case 'live_edit_price': {
            const num = parseInt(text.replace(/[^0-9]/g, ''), 10);
            if (isNaN(num) || num < 0) {
                await sendTelegramMessage(chatId, `❌ Enter a valid price in ₦ (e.g. 5000):`);
                return true;
            }
            await prisma.product.update({ where: { id: productId }, data: { price: num } });
            break;
        }
        case 'live_edit_description': {
            await prisma.product.update({ where: { id: productId }, data: { description: text.trim().substring(0, 500) || null } });
            break;
        }
        case 'live_edit_stock': {
            const num = parseInt(text.replace(/[^0-9]/g, ''), 10);
            if (isNaN(num) || num < 1) {
                await sendTelegramMessage(chatId, `❌ Enter a valid quantity (minimum 1):`);
                return true;
            }
            await prisma.product.update({ where: { id: productId }, data: { stock: num } });
            break;
        }
        case 'live_edit_variants': {
            if (text.toLowerCase().trim() === 'none') {
                await prisma.productVariant.deleteMany({ where: { productId } });
                await setSessionState(chatId, { step: 'idle' });
                await sendTelegramMessage(chatId, `✅ All variants removed.`);
                await sendLiveEditMenu(chatId, productId);
                return true;
            }
            const parsed = parseVariantString(text, Number(product.price));
            if (parsed.length === 0) {
                await sendTelegramMessage(chatId,
                    `❌ Couldn't parse variants. Try:\n• Same price: \`Size S, Size M\`\n• Different prices: \`Size S:5000, Size M:6000\``
                );
                return true;
            }
            await prisma.productVariant.deleteMany({ where: { productId } });
            await prisma.productVariant.createMany({
                data: parsed.map(v => ({ ...v, productId })),
            });
            await setSessionState(chatId, { step: 'idle' });
            await sendTelegramMessage(chatId, `✅ ${parsed.length} variant${parsed.length > 1 ? 's' : ''} saved.`);
            await sendLiveEditMenu(chatId, productId);
            return true;
        }
    }

    await setSessionState(chatId, { step: 'idle' });
    await sendTelegramMessage(chatId, `✅ Updated!`);
    await sendLiveEditMenu(chatId, productId);
    return true;
}

// ─── State machine: text replies during pre-listing edit flow ─────────────────

async function handleStateMessage(chatId: number, text: string, state: BotState, session: Awaited<ReturnType<typeof getSession>>, firstName = '') {
    if (state.step === 'idle' || state.step === 'confirm') return false;

    // Feedback flow
    if (state.step === 'waiting_feedback') {
        if (!text.trim()) {
            await sendTelegramMessage(chatId, `Please type your message:`, 'none');
            return true;
        }
        const storeSession = session?.storeId
            ? await prisma.store.findUnique({ where: { id: session.storeId }, select: { name: true } })
            : null;
        await forwardFeedbackToAdmin(chatId, text, { store: storeSession });
        await setSessionState(chatId, { step: 'idle' });
        await sendTelegramMessage(chatId, `✅ Your message has been sent to the DepMi team. We'll follow up if needed.`, 'none');
        return true;
    }

    // Dispatch live product edit states
    if ('productId' in state) {
        return handleLiveStateMessage(chatId, text, state as Extract<BotState, { productId: string }>);
    }

    // Settings states
    if (state.step.startsWith('settings_')) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return handleSettingsState(chatId, text, state as any, setSessionState);
    }

    // Payout states
    if (state.step.startsWith('payout_')) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return handlePayoutState(chatId, text, state as any, setSessionState);
    }

    // Buyer states
    if (state.step.startsWith('buyer_')) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return handleBuyerState(chatId, text, state as any, setSessionState, firstName);
    }

    const { tokenId } = state as Extract<BotState, { tokenId: string }>;
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

        case 'edit_variants': {
            if (text.toLowerCase().trim() === 'none') {
                data.variants = '';
            } else {
                data.variants = text.trim().substring(0, 300);
            }
            break;
        }

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
            await sendTelegramMessage(
                chatId,
                `🔖 Send *variants* (comma-separated):\n\n` +
                `• Same price for all: \`Size S, Size M, Size L\`\n` +
                `• Different prices: \`Size S:5000, Size M:6000\`\n` +
                `• Type \`none\` to remove all variants`
            );
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

        // ── Live product editing ──────────────────────────────────────────────

        case 'lp': {
            if (!session?.storeId) { await sendTelegramMessage(chatId, `Please /connect first.`); return; }
            const owned = await prisma.product.findFirst({
                where: { id: tokenId, storeId: session.storeId },
                select: { id: true },
            });
            if (!owned) { await sendTelegramMessage(chatId, `⚠️ Product not found or not yours.`); return; }
            await sendLiveEditMenu(chatId, tokenId);
            break;
        }

        case 'lpname':
            if (session) await setSessionState(chatId, { step: 'live_edit_name', productId: tokenId });
            await sendTelegramMessage(chatId, `📝 Send the new *product name*:`);
            break;

        case 'lpprice':
            if (session) await setSessionState(chatId, { step: 'live_edit_price', productId: tokenId });
            await sendTelegramMessage(chatId, `💰 Send the new *price* in ₦ (e.g. 5000):`);
            break;

        case 'lpdesc':
            if (session) await setSessionState(chatId, { step: 'live_edit_description', productId: tokenId });
            await sendTelegramMessage(chatId, `📄 Send the new *description* (max 500 chars):`);
            break;

        case 'lpstock':
            if (session) await setSessionState(chatId, { step: 'live_edit_stock', productId: tokenId });
            await sendTelegramMessage(chatId, `📦 How many do you have? Send a number (e.g. 5):`);
            break;

        case 'lpstatus': {
            if (!session?.storeId) return;
            const prod = await prisma.product.findFirst({
                where: { id: tokenId, storeId: session.storeId },
                select: { inStock: true },
            });
            if (!prod) return;
            await prisma.product.update({ where: { id: tokenId }, data: { inStock: !prod.inStock } });
            await sendTelegramMessage(chatId, prod.inStock ? `❌ Marked as sold out.` : `✅ Marked as in stock.`);
            await sendLiveEditMenu(chatId, tokenId);
            break;
        }

        case 'lpvar': {
            if (!session?.storeId) return;
            const prod = await prisma.product.findFirst({
                where: { id: tokenId, storeId: session.storeId },
                include: { variants: { select: { name: true, price: true }, orderBy: { id: 'asc' } } },
            });
            if (!prod) { await sendTelegramMessage(chatId, `⚠️ Product not found.`); return; }

            const currentVariants = prod.variants.length > 0
                ? prod.variants.map(v => `• ${v.name} — ₦${Number(v.price).toLocaleString()}`).join('\n')
                : '_No variants set_';

            if (session) await setSessionState(chatId, { step: 'live_edit_variants', productId: tokenId });
            await sendTelegramMessage(
                chatId,
                `🔖 *Current variants:*\n${currentVariants}\n\n` +
                `Send new variants to *replace all*:\n` +
                `• Same price: \`Size S, Size M, Size L\`\n` +
                `• Different prices: \`Size S:5000, Size M:6000\`\n` +
                `• Type \`none\` to remove all variants`
            );
            break;
        }

        case 'products':
            if (session?.storeId) await handleProductsCommand(chatId, session.storeId);
            break;

        case 'feedback':
            if (!session) { await sendTelegramMessage(chatId, `Please /connect first.`, 'none'); return; }
            await setSessionState(chatId, { step: 'waiting_feedback' });
            await sendTelegramMessage(chatId, `📩 Type your complaint or feedback and I'll forward it to the DepMi team:`, 'none');
            break;

        case 'how_to_list':
            await sendTelegramMessage(
                chatId,
                `📸 *Send me a product photo!*\n\nInclude the price in the caption, e.g:\n_"Red Ankara bag 5500"_\n_"iPhone 13 Pro — ₦380k"_\n\nI'll do the rest.`
            );
            break;

        // ── Buyer flow ────────────────────────────────────────────────────────

        case 'bstart': {
            // callback_data: bstart:productId:storeId:price:isDigital
            const [productId, storeId, priceStr, digitalStr] = tokenId.split(':');
            const price = parseInt(priceStr ?? '0', 10);
            const isDigital = digitalStr === '1';
            await handleBuyStart(chatId, productId, storeId, price, isDigital, undefined, undefined, setSessionState, session);
            break;
        }

        case 'bvariant': {
            // callback_data: bvariant:productId:variantId:variantName:variantPrice:storeId:isDigital
            const [productId, variantId, variantName, priceStr, storeId, digitalStr] = tokenId.split(':');
            const price = parseInt(priceStr ?? '0', 10);
            const isDigital = digitalStr === '1';
            await handleBuyStart(chatId, productId, storeId, price, isDigital, variantId, decodeURIComponent(variantName ?? ''), setSessionState, session);
            break;
        }

        case 'baddr_reset': {
            // callback_data: baddr_reset:productId:storeId:price:isDigital
            const [productId, storeId, priceStr, digitalStr] = tokenId.split(':');
            const price = parseInt(priceStr ?? '0', 10);
            const isDigital = digitalStr === '1';
            if (session) await setSessionState(chatId, { step: 'buyer_address', productId, storeId, price, isDigital });
            await sendTelegramMessage(chatId, `📍 Enter your delivery address:\n\n<i>Format: Street, City, State</i>`, 'HTML');
            break;
        }

        case 'bconfirm': {
            if (!session?.userId) { await sendTelegramMessage(chatId, `Please /connect or verify your email first.`, 'none'); return; }
            const state = session.state as unknown as BotState;
            if (state.step !== 'buyer_confirm') { await sendTelegramMessage(chatId, `⚠️ Session expired. Please start over.`, 'none'); return; }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await handleBuyerConfirm(chatId, state as any, session.userId, setSessionState);
            break;
        }

        // ── Store settings ────────────────────────────────────────────────────

        case 'storet':
            if (!session?.storeId) { await sendTelegramMessage(chatId, `Please /connect first.`, 'none'); return; }
            await sendSettingsMenu(chatId, session.storeId);
            break;

        case 'sfee_local':
            if (!session?.storeId) return;
            await setSessionState(chatId, { step: 'settings_local_fee', storeId: session.storeId });
            await sendTelegramMessage(chatId, `📦 Enter your *local delivery fee* in ₦ (or type "free"):`, 'none');
            break;

        case 'sfee_nation':
            if (!session?.storeId) return;
            await setSessionState(chatId, { step: 'settings_nationwide_fee', storeId: session.storeId });
            await sendTelegramMessage(chatId, `🚚 Enter your *nationwide delivery fee* in ₦ (or type "free"):`, 'none');
            break;

        case 'spickup':
            if (!session?.storeId) return;
            await setSessionState(chatId, { step: 'settings_pickup', storeId: session.storeId });
            await sendTelegramMessage(chatId, `📍 Enter your *pickup address*:`, 'none');
            break;

        case 'sstate':
            if (!session?.storeId) return;
            await setSessionState(chatId, { step: 'settings_state', storeId: session.storeId });
            await sendTelegramMessage(chatId, `🗺 Enter your *state* (e.g. Lagos):`, 'none');
            break;

        case 'sdesc':
            if (!session?.storeId) return;
            await setSessionState(chatId, { step: 'settings_description', storeId: session.storeId });
            await sendTelegramMessage(chatId, `📝 Enter your *store description* (max 500 chars):`, 'none');
            break;

        case 'sloc':
            if (!session?.storeId) return;
            await setSessionState(chatId, { step: 'settings_location', storeId: session.storeId });
            await sendTelegramMessage(chatId, `📌 Enter your *location* (e.g. Lagos, Nigeria):`, 'none');
            break;

        case 'sdispatch':
            if (!session?.storeId) return;
            await handleDispatchToggle(chatId, session.storeId);
            break;

        // ── Payout flow ───────────────────────────────────────────────────────

        case 'payout':
            if (!session?.storeId) { await sendTelegramMessage(chatId, `Please /connect first.`, 'none'); return; }
            await setSessionState(chatId, { step: 'payout_bank_search', storeId: session.storeId });
            await sendTelegramMessage(chatId, `🏦 Type the name of your bank (e.g. "access", "zenith", "gtb"):`, 'none');
            break;

        case 'bk': {
            // tokenId here is the bank code
            if (!session?.storeId) return;
            const bankCode = tokenId;
            const { getBankList } = await import('@/lib/flutterwave');
            const banks = await getBankList().catch(() => []);
            const bank = banks.find(b => b.code === bankCode);
            if (!bank) { await sendTelegramMessage(chatId, `⚠️ Bank not found. Type /payout to try again.`, 'none'); return; }
            await setSessionState(chatId, {
                step: 'payout_account_no',
                storeId: session.storeId,
                bankCode: bank.code,
                bankName: bank.name,
            });
            await sendTelegramMessage(chatId, `✅ Selected: <b>${bank.name}</b>\n\nEnter your 10-digit account number:`, 'HTML');
            break;
        }

        case 'payout_confirm': {
            // tokenId = bankCode:acctNo:encodedName:encodedBankName (rest of the split)
            if (!session?.storeId || !session?.userId) return;
            await handlePayoutConfirmCallback(chatId, tokenId, session.storeId, session.userId, setSessionState);
            break;
        }
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
        if (text.startsWith('/start')) {
            const param = text.split(' ')[1] ?? '';
            if (param.startsWith('p_')) {
                // Deep link: t.me/depmibot?start=p_SLUG
                await handleBuyerDeepLink(chatId, param.slice(2), setSessionState, session);
                return;
            }
            await handleHelpCommand(chatId, connected);
            return;
        }
        if (text.startsWith('/help')) {
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
        if (text.startsWith('/settings') && connected && session?.storeId) {
            await sendSettingsMenu(chatId, session.storeId);
            return;
        }
        if (text.startsWith('/payout') && connected && session?.storeId) {
            await setSessionState(chatId, { step: 'payout_bank_search', storeId: session.storeId });
            await sendTelegramMessage(chatId, `🏦 Type the name of your bank (e.g. "access", "zenith", "gtb"):`, 'none');
            return;
        }
        if (text.startsWith('/feedback') || text.startsWith('/complaint')) {
            if (!connected) {
                await sendTelegramMessage(chatId, `Please /connect first to send feedback.`, 'none');
                return;
            }
            if (session) await setSessionState(chatId, { step: 'waiting_feedback' });
            await sendTelegramMessage(chatId, `📩 Type your message and I'll forward it to the DepMi team:`, 'none');
            return;
        }
        if (text.startsWith('/admin')) {
            await handleAdminCommand(chatId, text);
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
            await handlePhotoMessage(chatId, message, caption, session.storeId);
            return;
        }

        // Text message — check state machine (pre-listing edits + live product edits + feedback)
        if (session && text) {
            const state = (session.state as unknown as BotState) ?? { step: 'idle' };
            const firstName = message.from?.first_name ?? '';
            const handled = await handleStateMessage(chatId, text, state, session, firstName);
            if (handled) return;
        }

        // Handle pasted depmi bot deep links (t.me/depmibot?start=p_SLUG or depmi.com/p/SLUG)
        const botLinkMatch = text.match(/[?&]start=p_([A-Za-z0-9_-]+)/);
        const depmiLinkMatch = text.match(/depmi\.com\/p\/([A-Za-z0-9_-]+)/);
        const linkSlug = botLinkMatch?.[1] ?? depmiLinkMatch?.[1];
        if (linkSlug) {
            await handleBuyerDeepLink(chatId, linkSlug, setSessionState, session);
            return;
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
