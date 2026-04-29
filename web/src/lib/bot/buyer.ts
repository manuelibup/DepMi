import { prisma } from '@/lib/prisma';
import { generateOtp, verifyOtp } from '@/lib/otp';
import { resend } from '@/lib/resend';
import { initializeBankTransfer } from '@/lib/flutterwave';
import { sendTelegramMessage, sendTelegramMessageWithButtons, escapeHtml } from './telegram';

// ─── State types ───────────────────────────────────────────────────────────────

export type BuyerState =
    | { step: 'buyer_email'; productSlug: string }
    | { step: 'buyer_otp'; userId: string; email: string; productSlug: string }
    | { step: 'buyer_address'; productId: string; storeId: string; price: number; variantId?: string; variantName?: string; isDigital: boolean }
    | { step: 'buyer_confirm'; productId: string; storeId: string; price: number; variantId?: string; variantName?: string; isDigital: boolean; address: string };

type SetState = (chatId: number, state: object) => Promise<void>;

// ─── Auth helpers ──────────────────────────────────────────────────────────────

export async function getOrCreateBuyer(
    email: string,
    chatId: number,
    firstName: string,
): Promise<string> {
    const normalised = email.toLowerCase().trim();

    // Find existing user or create ghost buyer
    let user = await prisma.user.findUnique({ where: { email: normalised }, select: { id: true } });

    if (!user) {
        const baseUsername = `tg${chatId}`;
        const taken = await prisma.user.findUnique({ where: { username: baseUsername } });
        const username = taken ? `tg${chatId}_${Date.now().toString(36)}` : baseUsername;

        user = await prisma.user.create({
            data: {
                email: normalised,
                displayName: firstName || 'DepMi Buyer',
                username,
                emailVerified: true,
                onboardingComplete: true,
            },
            select: { id: true },
        });
    }

    // Link BotSession to this user
    await prisma.botSession.updateMany({
        where: { platform: 'TELEGRAM', externalId: String(chatId) },
        data: { userId: user.id },
    });

    return user.id;
}

// ─── Product card ──────────────────────────────────────────────────────────────

type ProductRow = {
    id: string;
    title: string;
    price: { toNumber: () => number } | number;
    description: string | null;
    isDigital: boolean;
    inStock: boolean;
    stock: number;
    store: { name: string; slug: string; id: string };
    images: { url: string }[];
    variants: { id: string; name: string; price: { toNumber: () => number } | number }[];
};

function toNum(v: { toNumber: () => number } | number) {
    return typeof v === 'number' ? v : v.toNumber();
}

export async function sendProductCard(chatId: number, product: ProductRow) {
    const price = toNum(product.price);
    const type = product.isDigital ? '⚡ Digital' : '📦 Physical';
    const stock = product.inStock ? (product.stock > 1 ? `${product.stock} in stock` : 'In stock') : '❌ Sold out';

    let text =
        `🛍 <b>${escapeHtml(product.title)}</b>\n` +
        `₦${price.toLocaleString()} · ${type} · ${stock}\n` +
        `<i>${escapeHtml(product.store.name)}</i>`;

    if (product.description) {
        const desc = product.description.slice(0, 120);
        text += `\n\n${escapeHtml(desc)}${product.description.length > 120 ? '…' : ''}`;
    }

    if (!product.inStock) {
        await sendTelegramMessage(chatId, text + '\n\n❌ This item is currently sold out.', 'HTML');
        return;
    }

    // If variants exist, show variant picker instead of direct buy
    // Telegram callback_data limit is 64 bytes — use 8-char prefix of each UUID.
    // Handlers resolve full IDs with prisma findFirst({ where: { id: { startsWith } } }).
    const pid = product.id.slice(0, 8);
    const sid = product.store.id.slice(0, 8);
    const dig = product.isDigital ? '1' : '0';

    if (product.variants.length > 0) {
        const variantRows: { text: string; callback_data?: string; url?: string }[][] = [];
        for (let i = 0; i < product.variants.length; i += 2) {
            variantRows.push(
                product.variants.slice(i, i + 2).map(v => ({
                    text: `${v.name} — ₦${toNum(v.price).toLocaleString()}`,
                    // bvariant:pid8:vid8:price:sid8:digital  (≤ 50 bytes)
                    callback_data: `bvariant:${pid}:${v.id.slice(0, 8)}:${toNum(v.price)}:${sid}:${dig}`,
                }))
            );
        }
        variantRows.push([{ text: '🔗 View on DepMi', url: `https://depmi.com/p/${product.id}` }]);

        await sendTelegramMessageWithButtons(
            chatId,
            text + '\n\n<b>Select a variant to buy:</b>',
            variantRows,
            'HTML',
        );
        return;
    }

    await sendTelegramMessageWithButtons(
        chatId,
        text,
        [
            // bstart:pid8:sid8:price:digital  (≤ 40 bytes)
            [{ text: '🛒 Buy now', callback_data: `bstart:${pid}:${sid}:${price}:${dig}` }],
            [{ text: '🔗 View on DepMi', url: `https://depmi.com/p/${product.id}` } as { text: string; url: string }],
        ] as { text: string; callback_data?: string; url?: string }[][],
        'HTML',
    );
}

// ─── Deep link handler: /start p_SLUG ─────────────────────────────────────────

export async function handleBuyerDeepLink(
    chatId: number,
    slug: string,
    setState: SetState,
    session: { userId?: string | null } | null,
) {
    const product = await prisma.product.findFirst({
        where: { OR: [{ slug }, { id: slug }] },
        select: {
            id: true, title: true, price: true, description: true,
            isDigital: true, inStock: true, stock: true,
            store: { select: { id: true, name: true, slug: true } },
            images: { select: { url: true }, orderBy: { order: 'asc' }, take: 1 },
            variants: { select: { id: true, name: true, price: true }, orderBy: { id: 'asc' } },
        },
    });

    if (!product) {
        await sendTelegramMessage(chatId, `⚠️ Product not found. It may have been removed.`, 'none');
        return;
    }

    await sendProductCard(chatId, {
        ...product,
        store: { id: product.store.id, name: product.store.name, slug: product.store.slug },
    });

    // If buyer is not authenticated, nudge them
    if (!session?.userId) {
        await sendTelegramMessage(
            chatId,
            `👆 Tap <b>Buy now</b> and we'll ask for your email to complete checkout.\n\nAlready have a DepMi account? Same email works.`,
            'HTML',
        );
    }
}

// ─── Buy flow: start (auth gate) ──────────────────────────────────────────────

export async function handleBuyStart(
    chatId: number,
    productIdPrefix: string,   // may be full UUID or 8-char prefix
    storeIdPrefix: string,     // may be full UUID or 8-char prefix
    price: number,
    isDigital: boolean,
    variantIdPrefix: string | undefined,
    variantName: string | undefined,
    setState: SetState,
    session: { userId?: string | null } | null,
) {
    // Resolve short prefixes to full IDs
    const productRow = await prisma.product.findFirst({
        where: { id: { startsWith: productIdPrefix } },
        select: { id: true, store: { select: { id: true } } },
    });
    if (!productRow) {
        await sendTelegramMessage(chatId, `⚠️ Product not found. It may have been removed.`, 'none');
        return;
    }
    const productId = productRow.id;
    const storeId = productRow.store.id;

    let variantId: string | undefined;
    if (variantIdPrefix) {
        const vRow = await prisma.productVariant.findFirst({
            where: { id: { startsWith: variantIdPrefix } },
            select: { id: true, name: true },
        });
        variantId = vRow?.id;
        if (!variantName && vRow) variantName = vRow.name;
    }

    if (!session?.userId) {
        // Not logged in — collect email first, then resume buy flow
        await setState(chatId, { step: 'buyer_email', productSlug: productId });
        await sendTelegramMessage(
            chatId,
            `📧 Enter your email address to continue:\n\n<i>Already have a DepMi account? Use the same email.</i>`,
            'HTML',
        );
        return;
    }

    // Logged in — digital skips address and goes straight to confirm with button
    if (isDigital) {
        await setState(chatId, {
            step: 'buyer_confirm',
            productId, storeId, price,
            variantId, variantName,
            isDigital,
            address: '',
        });
        const variantLine = variantName ? `\nVariant: <b>${escapeHtml(variantName)}</b>` : '';
        await sendTelegramMessageWithButtons(
            chatId,
            `⚡ <b>Digital product</b> — instant delivery!\n\n` +
            `📋 <b>Order summary</b>\n\n` +
            `Amount: <b>₦${price.toLocaleString()}</b>${variantLine}\n\n` +
            `Payment: <b>Bank transfer</b> (account details sent after confirming)\n\n` +
            `Confirm order?`,
            [[{ text: '✅ Confirm & get payment details', callback_data: 'bconfirm' }]],
            'HTML',
        );
        return;
    }

    await setState(chatId, { step: 'buyer_address', productId, storeId, price, variantId, variantName, isDigital });
    await sendTelegramMessage(
        chatId,
        `📍 Enter your delivery address:\n\n<i>Format: Street, City, State (e.g. 15 Woji Road, Port Harcourt, Rivers)</i>`,
        'HTML',
    );
}

// ─── State handlers ───────────────────────────────────────────────────────────

export async function handleBuyerState(
    chatId: number,
    text: string,
    state: BuyerState,
    setState: SetState,
    telegramFirstName: string,
): Promise<boolean> {
    switch (state.step) {
        case 'buyer_email': {
            const email = text.trim().toLowerCase();
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                await sendTelegramMessage(chatId, `❌ That doesn't look like a valid email. Try again:`, 'none');
                return true;
            }

            // Upsert user first (OtpToken requires a real userId FK)
            const userId = await getOrCreateBuyer(email, chatId, telegramFirstName);
            const code = await generateOtp(userId, 'EMAIL_VERIFICATION');
            const FROM = process.env.RESEND_FROM_EMAIL || 'DepMi <noreply@depmi.com>';

            await resend.emails.send({
                from: FROM,
                to: email,
                subject: 'DepMi — Your verification code',
                html: `<p>Your DepMi verification code is: <strong style="font-size:24px;letter-spacing:4px">${code}</strong></p><p>Expires in 10 minutes.</p>`,
            }).catch(err => console.error('[bot/buyer] Resend OTP failed:', err));

            await setState(chatId, { step: 'buyer_otp', userId, email, productSlug: state.productSlug });
            await sendTelegramMessage(chatId, `📧 A 6-digit code has been sent to <b>${escapeHtml(email)}</b>.\n\nEnter it here:`, 'HTML');
            return true;
        }

        case 'buyer_otp': {
            const code = text.replace(/\D/g, '');
            if (code.length !== 6) {
                await sendTelegramMessage(chatId, `❌ Enter the 6-digit code from your email:`, 'none');
                return true;
            }

            const valid = await verifyOtp(state.userId, 'EMAIL_VERIFICATION', code);
            if (!valid) {
                await sendTelegramMessage(chatId, `❌ Invalid or expired code. Type your email again to restart:`, 'none');
                await setState(chatId, { step: 'buyer_email', productSlug: state.productSlug });
                return true;
            }

            // Mark email as verified
            await prisma.user.update({ where: { id: state.userId }, data: { emailVerified: true } });

            await setState(chatId, { step: 'idle' });
            await sendTelegramMessage(chatId, `✅ Verified! Loading your product…`, 'none');

            // Re-display the product to continue checkout
            const product = await prisma.product.findFirst({
                where: { OR: [{ slug: state.productSlug }, { id: state.productSlug }] },
                select: {
                    id: true, title: true, price: true, description: true,
                    isDigital: true, inStock: true, stock: true,
                    store: { select: { id: true, name: true, slug: true } },
                    images: { select: { url: true }, orderBy: { order: 'asc' }, take: 1 },
                    variants: { select: { id: true, name: true, price: true }, orderBy: { id: 'asc' } },
                },
            });

            if (product) {
                await sendProductCard(chatId, {
                    ...product,
                    store: { id: product.store.id, name: product.store.name, slug: product.store.slug },
                });
            }
            return true;
        }

        case 'buyer_address': {
            if (state.isDigital) return false; // digital uses callback, not text
            const address = text.trim();
            if (address.length < 10) {
                await sendTelegramMessage(chatId, `Please enter your full delivery address (street, city, state):`, 'none');
                return true;
            }

            // Show order summary + confirm button
            await setState(chatId, {
                step: 'buyer_confirm',
                productId: state.productId,
                storeId: state.storeId,
                price: state.price,
                variantId: state.variantId,
                variantName: state.variantName,
                isDigital: state.isDigital,
                address,
            });

            const variantLine = state.variantName ? `\nVariant: <b>${escapeHtml(state.variantName)}</b>` : '';
            await sendTelegramMessageWithButtons(
                chatId,
                `📋 <b>Order summary</b>\n\n` +
                `Amount: <b>₦${state.price.toLocaleString()}</b>${variantLine}\n` +
                `Delivery to: <b>${escapeHtml(address)}</b>\n\n` +
                `Payment: <b>Bank transfer</b> (account details sent after confirming)\n\n` +
                `Confirm order?`,
                [
                    [
                        { text: '✅ Confirm & get payment details', callback_data: 'bconfirm' },
                        // baddr_reset uses 8-char prefixes — full IDs are in session state
                        { text: '✏️ Change address', callback_data: `baddr_reset:${state.productId.slice(0, 8)}:${state.price}:${state.isDigital ? '1' : '0'}` },
                    ],
                ],
                'HTML',
            );
            return true;
        }

        default:
            return false;
    }
}

// ─── Confirm callback: create order + generate virtual account ─────────────────

export async function handleBuyerConfirm(
    chatId: number,
    state: Extract<BuyerState, { step: 'buyer_confirm' }>,
    userId: string,
    setState: SetState,
) {
    await setState(chatId, { step: 'idle' });

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { displayName: true, email: true },
    });
    if (!user?.email) {
        await sendTelegramMessage(chatId, `⚠️ Something went wrong. Type /start to try again.`, 'none');
        return;
    }

    await sendTelegramMessage(chatId, `⏳ Creating your order…`, 'none');

    // Create the order
    const order = await prisma.order.create({
        data: {
            buyerId: userId,
            sellerId: state.storeId,
            totalAmount: state.price,
            status: 'PENDING',
            escrowStatus: 'HELD',
            isDigital: state.isDigital,
            deliveryAddress: state.address || null,
            platformFeeNgn: 0,
            items: {
                create: {
                    productId: state.productId,
                    quantity: 1,
                    price: state.price,
                    variantId: state.variantId || null,
                    variantName: state.variantName || null,
                },
            },
        },
    });

    // Generate virtual bank account
    let charge;
    try {
        charge = await initializeBankTransfer({
            orderId: order.id,
            amount: state.price,
            buyerName: user.displayName,
            buyerEmail: user.email,
        });
    } catch (err) {
        console.error('[bot/buyer] initializeBankTransfer failed:', err);
        await sendTelegramMessage(
            chatId,
            `⚠️ Could not generate payment account. Please try again or complete checkout at depmi.com/orders`,
            'none',
        );
        return;
    }

    // Store virtual account on order
    const expiryDate = charge.expiresAt ? new Date(charge.expiresAt) : new Date(Date.now() + 30 * 60 * 1000);
    await prisma.order.update({
        where: { id: order.id },
        data: {
            paystackRef: charge.txRef,
            virtualAcctNo: charge.accountNumber,
            virtualAcctBank: charge.bankName,
            virtualAcctExpiry: expiryDate,
        },
    });

    const expiryStr = expiryDate.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', hour12: true });

    await sendTelegramMessageWithButtons(
        chatId,
        `✅ <b>Order created!</b>\n\n` +
        `Transfer <b>₦${state.price.toLocaleString()}</b> to:\n\n` +
        `🏦 Bank: <b>${escapeHtml(charge.bankName)}</b>\n` +
        `💳 Account: <b>${charge.accountNumber}</b>\n` +
        `⏰ Expires: <b>${expiryStr}</b>\n\n` +
        `<i>Transfer the exact amount. We'll notify you here as soon as it's confirmed.</i>\n\n` +
        `Order ref: <code>#${order.id.slice(-6).toUpperCase()}</code>`,
        [[{ text: '📋 View order on DepMi', url: 'https://depmi.com/orders' }]],
        'HTML',
    );
}
