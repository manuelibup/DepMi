import { prisma } from '@/lib/prisma';
import { generateOtp, verifyOtp } from '@/lib/otp';
import { resend } from '@/lib/resend';
import { sendTelegramMessage, sendTelegramMessageWithButtons, escapeHtml, setCommandsForChat } from './telegram';

// ─── State types ───────────────────────────────────────────────────────────────

export type OnboardingState =
    | { step: 'ob_email' }
    | { step: 'ob_otp'; userId: string; email: string }
    | { step: 'ob_username'; userId: string }
    | { step: 'ob_store_name'; userId: string }
    | { step: 'ob_store_slug'; userId: string; storeName: string }
    | { step: 'ob_store_phone'; userId: string; storeName: string; storeSlug: string };

type SetState = (chatId: number, state: object) => Promise<void>;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function slugify(text: string) {
    return text.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30);
}

async function isSlugTaken(slug: string): Promise<boolean> {
    const [store, user] = await Promise.all([
        prisma.store.findFirst({ where: { slug }, select: { id: true } }),
        prisma.user.findFirst({ where: { username: slug }, select: { id: true } }),
    ]);
    return !!(store || user);
}

// ─── Entry point ───────────────────────────────────────────────────────────────

export async function handleSignupCommand(
    chatId: number,
    session: { userId?: string | null; storeId?: string | null } | null,
    setState: SetState,
) {
    // Already fully set up as a seller
    if (session?.storeId) {
        await sendTelegramMessage(chatId, `✅ You're already signed up and connected to a store.\n\nSend a product photo to list something, or use /help.`, 'none');
        return;
    }

    // Has account but no store
    if (session?.userId) {
        const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { displayName: true, username: true },
        });
        await sendTelegramMessageWithButtons(
            chatId,
            `👋 You're already signed in as <b>${escapeHtml(user?.displayName ?? '')}</b>.\n\nWant to create a store so you can start selling?`,
            [[
                { text: '🏪 Create a store', callback_data: 'ob_create_store' },
                { text: 'Not now', callback_data: 'ob_skip' },
            ]],
            'HTML',
        );
        return;
    }

    // New user — start signup
    await setState(chatId, { step: 'ob_email' });
    await sendTelegramMessage(
        chatId,
        `👋 Welcome to DepMi!\n\nLet's get you set up. Enter your email address to create your account:`,
        'none',
    );
}

// ─── Create store entry (for already-signed-in users) ─────────────────────────

export async function handleCreateStoreEntry(chatId: number, userId: string, setState: SetState) {
    const existing = await prisma.store.findFirst({ where: { ownerId: userId }, select: { slug: true } });
    if (existing) {
        await sendTelegramMessage(chatId, `You already have a store. Use /settings to manage it.`, 'none');
        return;
    }
    await setState(chatId, { step: 'ob_store_name', userId });
    await sendTelegramMessage(chatId, `🏪 What's your store name?\n\n<i>This is your public business name (e.g. "Zara Fashion", "Tech Hub")</i>`, 'HTML');
}

// ─── State handler ─────────────────────────────────────────────────────────────

export async function handleOnboardingState(
    chatId: number,
    text: string,
    state: OnboardingState,
    setState: SetState,
    telegramFirstName: string,
): Promise<boolean> {
    switch (state.step) {

        case 'ob_email': {
            const email = text.trim().toLowerCase();
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                await sendTelegramMessage(chatId, `❌ That doesn't look like a valid email. Try again:`, 'none');
                return true;
            }

            // Find or create user
            let user = await prisma.user.findUnique({ where: { email }, select: { id: true, username: true } });
            if (!user) {
                const baseUsername = `tg${chatId}`;
                const taken = await prisma.user.findUnique({ where: { username: baseUsername } });
                user = await prisma.user.create({
                    data: {
                        email,
                        displayName: telegramFirstName || 'DepMi User',
                        username: taken ? `tg${chatId}_${Date.now().toString(36)}` : baseUsername,
                        onboardingComplete: false,
                    },
                    select: { id: true, username: true },
                });
            }

            // Link BotSession
            await prisma.botSession.updateMany({
                where: { platform: 'TELEGRAM', externalId: String(chatId) },
                data: { userId: user.id },
            });

            const code = await generateOtp(user.id, 'EMAIL_VERIFICATION');
            const FROM = process.env.RESEND_FROM_EMAIL || 'DepMi <noreply@depmi.com>';
            await resend.emails.send({
                from: FROM,
                to: email,
                subject: 'DepMi — Your verification code',
                html: `<p>Your DepMi verification code is: <strong style="font-size:24px;letter-spacing:4px">${code}</strong></p><p>Expires in 10 minutes.</p>`,
            }).catch(err => console.error('[bot/onboarding] Resend failed:', err));

            await setState(chatId, { step: 'ob_otp', userId: user.id, email });
            await sendTelegramMessage(chatId, `📧 Code sent to <b>${escapeHtml(email)}</b>.\n\nEnter the 6-digit code:`, 'HTML');
            return true;
        }

        case 'ob_otp': {
            const code = text.replace(/\D/g, '');
            if (code.length !== 6) {
                await sendTelegramMessage(chatId, `❌ Enter the 6-digit code from your email:`, 'none');
                return true;
            }
            const valid = await verifyOtp(state.userId, 'EMAIL_VERIFICATION', code);
            if (!valid) {
                await sendTelegramMessage(chatId, `❌ Invalid or expired code. Type your email again to restart:`, 'none');
                await setState(chatId, { step: 'ob_email' });
                return true;
            }

            await prisma.user.update({ where: { id: state.userId }, data: { emailVerified: true } });
            await setState(chatId, { step: 'ob_username', userId: state.userId });
            await sendTelegramMessage(
                chatId,
                `✅ Email verified!\n\nPick a username for your profile — this is your @handle on DepMi:\n\n<i>Lowercase letters and numbers only, min 3 characters</i>`,
                'HTML',
            );
            return true;
        }

        case 'ob_username': {
            const raw = text.trim().replace(/^@/, '').toLowerCase();
            const username = raw.replace(/[^a-z0-9_]/g, '');
            if (username.length < 3) {
                await sendTelegramMessage(chatId, `❌ Username must be at least 3 characters. Try again:`, 'none');
                return true;
            }
            const taken = await prisma.user.findFirst({ where: { username, NOT: { id: state.userId } } });
            if (taken) {
                await sendTelegramMessage(chatId, `❌ @${username} is taken. Try a different one:`, 'none');
                return true;
            }

            await prisma.user.update({
                where: { id: state.userId },
                data: { username, displayName: telegramFirstName || username, onboardingComplete: true },
            });

            await setState(chatId, { step: 'idle' });
            await sendTelegramMessageWithButtons(
                chatId,
                `🎉 Account created! Welcome to DepMi, <b>${escapeHtml(telegramFirstName || username)}</b>.\n\nYour handle is <b>@${username}</b>.\n\nWhat would you like to do?`,
                [
                    [{ text: '🏪 Create a store & start selling', callback_data: 'ob_create_store' }],
                    [{ text: '🛍 Browse & buy products', callback_data: 'ob_skip' }],
                ],
                'HTML',
            );
            return true;
        }

        case 'ob_store_name': {
            const name = text.trim().slice(0, 60);
            if (name.length < 2) {
                await sendTelegramMessage(chatId, `Please enter a store name (at least 2 characters):`, 'none');
                return true;
            }

            // Check name conflict
            const conflict = await prisma.store.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } });
            if (conflict) {
                await sendTelegramMessage(chatId, `❌ That store name is already taken. Try a different one:`, 'none');
                return true;
            }

            const suggested = slugify(name);
            const slugTaken = await isSlugTaken(suggested);

            await setState(chatId, { step: 'ob_store_slug', userId: state.userId, storeName: name });
            await sendTelegramMessageWithButtons(
                chatId,
                `✅ Store name: <b>${escapeHtml(name)}</b>\n\nNow pick your store handle (shown as <code>depmi.com/@handle</code>):\n\n` +
                (slugTaken ? `<i>Suggested handle "@${suggested}" is taken — type a custom one:</i>` : `<i>Suggested: <b>@${suggested}</b> — tap to use it or type your own</i>`),
                slugTaken ? [] : [[{ text: `✅ Use @${suggested}`, callback_data: `ob_slug:${suggested}` }]],
                'HTML',
            );
            return true;
        }

        case 'ob_store_slug': {
            const raw = text.trim().replace(/^@/, '').toLowerCase();
            const slug = raw.replace(/[^a-z0-9]/g, '');
            if (slug.length < 3) {
                await sendTelegramMessage(chatId, `❌ Handle must be at least 3 characters (letters and numbers only):`, 'none');
                return true;
            }
            if (await isSlugTaken(slug)) {
                await sendTelegramMessage(chatId, `❌ @${slug} is already taken. Try another:`, 'none');
                return true;
            }

            await setState(chatId, { step: 'ob_store_phone', userId: state.userId, storeName: state.storeName, storeSlug: slug });
            await sendTelegramMessage(
                chatId,
                `✅ Handle: <b>@${slug}</b>\n\nEnter a phone number buyers can reach you on:\n<i>e.g. 08012345678</i>`,
                'HTML',
            );
            return true;
        }

        case 'ob_store_phone': {
            const phone = text.replace(/\D/g, '');
            if (phone.length < 10) {
                await sendTelegramMessage(chatId, `❌ Enter a valid Nigerian phone number (e.g. 08012345678):`, 'none');
                return true;
            }

            // Check phone conflict
            const conflict = await prisma.user.findFirst({
                where: { phoneNumber: phone, NOT: { id: state.userId } },
                select: { id: true },
            });
            if (conflict) {
                await sendTelegramMessage(chatId, `❌ That phone number is already linked to another account. Use a different number:`, 'none');
                return true;
            }

            const feeWaiverUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

            const store = await prisma.$transaction(async (tx) => {
                const s = await tx.store.create({
                    data: {
                        ownerId: state.userId,
                        name: state.storeName,
                        slug: state.storeSlug,
                        phoneNumber: phone,
                        isActive: true,
                        feeWaiverUntil,
                    },
                });
                await tx.user.update({
                    where: { id: state.userId },
                    data: { phoneNumber: phone },
                });
                return s;
            });

            // Link store to BotSession + upgrade command menu
            await prisma.botSession.updateMany({
                where: { platform: 'TELEGRAM', externalId: String(chatId) },
                data: { storeId: store.id },
            });
            await setCommandsForChat(chatId, true).catch(() => {});
            await setState(chatId, { step: 'idle' });

            await sendTelegramMessageWithButtons(
                chatId,
                `🎉 <b>${escapeHtml(state.storeName)}</b> is live on DepMi!\n\n` +
                `Your store: <a href="https://depmi.com/${state.storeSlug}">depmi.com/${state.storeSlug}</a>\n\n` +
                `Send a *photo* of your first product to list it instantly ↓`,
                [[{ text: '⚙️ Store settings', callback_data: 'storet' }]],
                'HTML',
            );
            return true;
        }
    }
    return false;
}
