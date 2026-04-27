import { prisma } from '@/lib/prisma';
import { getBankList, resolveAccountName } from '@/lib/flutterwave';
import { generateOtp, verifyOtp } from '@/lib/otp';
import { resend } from '@/lib/resend';
import { sendTelegramMessage, sendTelegramMessageWithButtons, escapeHtml } from './telegram';

// ─── State types (imported into route.ts BotState union) ─────────────────────

export type SettingsState =
    | { step: 'settings_local_fee'; storeId: string }
    | { step: 'settings_nationwide_fee'; storeId: string }
    | { step: 'settings_pickup'; storeId: string }
    | { step: 'settings_state'; storeId: string }
    | { step: 'settings_description'; storeId: string }
    | { step: 'settings_location'; storeId: string };

export type PayoutState =
    | { step: 'payout_bank_search'; storeId: string }
    | { step: 'payout_account_no'; storeId: string; bankCode: string; bankName: string }
    | { step: 'payout_otp'; storeId: string; userId: string; bankCode: string; bankAccountNo: string; bankAccountName: string };

export type BotSettingsState = SettingsState | PayoutState;

type SetState = (chatId: number, state: object) => Promise<void>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function patchStore(storeId: string, data: Record<string, unknown>) {
    await prisma.store.update({ where: { id: storeId }, data });
}

function esc(s: string | null | undefined) {
    return escapeHtml(s ?? '');
}

// ─── Settings menu ────────────────────────────────────────────────────────────

export async function sendSettingsMenu(chatId: number, storeId: string) {
    const store = await prisma.store.findUnique({
        where: { id: storeId },
        select: {
            name: true,
            storeState: true,
            localDeliveryFee: true,
            nationwideDeliveryFee: true,
            pickupAddress: true,
            dispatchEnabled: true,
            location: true,
            description: true,
        },
    });
    if (!store) { await sendTelegramMessage(chatId, `⚠️ Store not found.`, 'none'); return; }

    const localFee = store.localDeliveryFee !== null ? `₦${Number(store.localDeliveryFee).toLocaleString()}` : 'not set';
    const nationFee = store.nationwideDeliveryFee !== null ? `₦${Number(store.nationwideDeliveryFee).toLocaleString()}` : 'not set';
    const dispatch = store.dispatchEnabled ? 'On ✅' : 'Off ❌';

    await sendTelegramMessageWithButtons(
        chatId,
        `⚙️ <b>Store Settings — ${esc(store.name)}</b>\n\n` +
        `📦 Local delivery: <b>${localFee}</b>\n` +
        `🚚 Nationwide: <b>${nationFee}</b>\n` +
        `📍 Pickup address: <b>${esc(store.pickupAddress) || 'not set'}</b>\n` +
        `🗺 State: <b>${esc(store.storeState) || 'not set'}</b>\n` +
        `📌 Location: <b>${esc(store.location) || 'not set'}</b>\n` +
        `🚛 Dispatch: <b>${dispatch}</b>`,
        [
            [
                { text: '📦 Local fee', callback_data: 'sfee_local' },
                { text: '🚚 Nationwide fee', callback_data: 'sfee_nation' },
            ],
            [
                { text: '📍 Pickup address', callback_data: 'spickup' },
                { text: '🗺 State', callback_data: 'sstate' },
            ],
            [
                { text: '📌 Location', callback_data: 'sloc' },
                { text: '📝 Description', callback_data: 'sdesc' },
            ],
            [{ text: store.dispatchEnabled ? '🚛 Disable dispatch' : '🚛 Enable dispatch', callback_data: 'sdispatch' }],
            [{ text: '💳 Payout account', callback_data: 'payout' }],
        ],
        'HTML',
    );
}

// ─── Settings state handler ───────────────────────────────────────────────────

export async function handleSettingsState(
    chatId: number,
    text: string,
    state: SettingsState,
    setState: SetState,
): Promise<boolean> {
    const { storeId } = state;

    switch (state.step) {
        case 'settings_local_fee': {
            if (text.toLowerCase() === 'free' || text === '0') {
                await patchStore(storeId, { localDeliveryFee: 0 });
            } else {
                const num = parseInt(text.replace(/[^0-9]/g, ''), 10);
                if (isNaN(num) || num < 0) {
                    await sendTelegramMessage(chatId, `❌ Enter a ₦ amount or type "free":`, 'none');
                    return true;
                }
                await patchStore(storeId, { localDeliveryFee: num });
            }
            await setState(chatId, { step: 'idle' });
            await sendTelegramMessage(chatId, `✅ Local delivery fee updated.`, 'none');
            await sendSettingsMenu(chatId, storeId);
            return true;
        }

        case 'settings_nationwide_fee': {
            if (text.toLowerCase() === 'free' || text === '0') {
                await patchStore(storeId, { nationwideDeliveryFee: 0 });
            } else {
                const num = parseInt(text.replace(/[^0-9]/g, ''), 10);
                if (isNaN(num) || num < 0) {
                    await sendTelegramMessage(chatId, `❌ Enter a ₦ amount or type "free":`, 'none');
                    return true;
                }
                await patchStore(storeId, { nationwideDeliveryFee: num });
            }
            await setState(chatId, { step: 'idle' });
            await sendTelegramMessage(chatId, `✅ Nationwide delivery fee updated.`, 'none');
            await sendSettingsMenu(chatId, storeId);
            return true;
        }

        case 'settings_pickup': {
            const addr = text.trim().substring(0, 300);
            if (!addr) { await sendTelegramMessage(chatId, `Please enter your pickup address:`, 'none'); return true; }
            await patchStore(storeId, { pickupAddress: addr, shipbubbleAddrCode: null });
            await setState(chatId, { step: 'idle' });
            await sendTelegramMessage(chatId, `✅ Pickup address updated.`, 'none');
            await sendSettingsMenu(chatId, storeId);
            return true;
        }

        case 'settings_state': {
            const st = text.trim().substring(0, 100);
            if (!st) { await sendTelegramMessage(chatId, `Please enter your state (e.g. Lagos):`, 'none'); return true; }
            await patchStore(storeId, { storeState: st });
            await setState(chatId, { step: 'idle' });
            await sendTelegramMessage(chatId, `✅ State updated to ${st}.`, 'none');
            await sendSettingsMenu(chatId, storeId);
            return true;
        }

        case 'settings_description': {
            const desc = text.trim().substring(0, 500);
            await patchStore(storeId, { description: desc || null });
            await setState(chatId, { step: 'idle' });
            await sendTelegramMessage(chatId, `✅ Store description updated.`, 'none');
            await sendSettingsMenu(chatId, storeId);
            return true;
        }

        case 'settings_location': {
            const loc = text.trim().substring(0, 200);
            if (!loc) { await sendTelegramMessage(chatId, `Please enter your location (e.g. Lagos, Nigeria):`, 'none'); return true; }
            await patchStore(storeId, { location: loc });
            await setState(chatId, { step: 'idle' });
            await sendTelegramMessage(chatId, `✅ Location updated to ${loc}.`, 'none');
            await sendSettingsMenu(chatId, storeId);
            return true;
        }
    }
    return false;
}

// ─── Payout state handler ─────────────────────────────────────────────────────

export async function handlePayoutState(
    chatId: number,
    text: string,
    state: PayoutState,
    setState: SetState,
): Promise<boolean> {
    switch (state.step) {
        case 'payout_bank_search': {
            const query = text.trim().toLowerCase();
            if (!query) { await sendTelegramMessage(chatId, `Type the name of your bank:`, 'none'); return true; }

            const banks = await getBankList().catch(() => []);
            const matches = banks
                .filter(b => b.name.toLowerCase().includes(query))
                .sort((a, b) => {
                    // Exact prefix match ranks higher
                    const aStarts = a.name.toLowerCase().startsWith(query) ? 0 : 1;
                    const bStarts = b.name.toLowerCase().startsWith(query) ? 0 : 1;
                    return aStarts - bStarts || a.name.localeCompare(b.name);
                })
                .slice(0, 6);

            if (matches.length === 0) {
                await sendTelegramMessage(chatId, `❌ No banks found for "${esc(text)}". Try a shorter search (e.g. "access", "zenith", "gtb"):`, 'none');
                return true;
            }

            const rows = matches.map(b => [{ text: b.name, callback_data: `bk:${b.code}` }]);
            rows.push([{ text: '← Cancel', callback_data: 'storet' }]);
            await sendTelegramMessageWithButtons(chatId, `🏦 Select your bank:`, rows, 'none');
            return true;
        }

        case 'payout_account_no': {
            const acctNo = text.replace(/\D/g, '');
            if (acctNo.length !== 10) {
                await sendTelegramMessage(chatId, `❌ Account number must be exactly 10 digits. Try again:`, 'none');
                return true;
            }

            await sendTelegramMessage(chatId, `⏳ Verifying account…`, 'none');
            let accountName: string;
            try {
                accountName = await resolveAccountName(acctNo, state.bankCode);
            } catch {
                await sendTelegramMessage(chatId, `❌ Could not verify that account number with ${esc(state.bankName)}. Check and try again:`, 'none');
                return true;
            }

            await sendTelegramMessageWithButtons(
                chatId,
                `✅ Account verified:\n\n<b>${esc(accountName)}</b>\n${esc(state.bankName)} · ${acctNo}\n\nIs this correct?`,
                [
                    [
                        { text: '✅ Yes, continue', callback_data: `payout_confirm:${state.bankCode}:${acctNo}:${encodeURIComponent(accountName)}:${encodeURIComponent(state.bankName)}` },
                        { text: '✏️ Re-enter', callback_data: `bk:${state.bankCode}` },
                    ],
                    [{ text: '← Change bank', callback_data: 'payout' }],
                ],
                'HTML',
            );
            await setState(chatId, { step: 'idle' });
            return true;
        }

        case 'payout_otp': {
            const code = text.replace(/\D/g, '');
            if (code.length !== 6) {
                await sendTelegramMessage(chatId, `❌ Enter the 6-digit code from your email:`, 'none');
                return true;
            }

            const valid = await verifyOtp(state.userId, 'ACCOUNT_UPDATE', code);
            if (!valid) {
                await sendTelegramMessage(chatId, `❌ Invalid or expired code. Tap /payout to start over.`, 'none');
                await setState(chatId, { step: 'idle' });
                return true;
            }

            await prisma.store.update({
                where: { id: state.storeId },
                data: {
                    bankCode: state.bankCode,
                    bankAccountNo: state.bankAccountNo,
                    bankAccountName: state.bankAccountName,
                },
            });

            await setState(chatId, { step: 'idle' });
            await sendTelegramMessage(
                chatId,
                `✅ Payout account saved!\n\n<b>${esc(state.bankAccountName)}</b> · ${state.bankAccountNo}`,
                'HTML',
            );
            return true;
        }
    }
    return false;
}

// ─── Payout confirm callback (after account verified, before OTP) ─────────────

export async function handlePayoutConfirmCallback(
    chatId: number,
    paramStr: string,
    storeId: string,
    userId: string,
    setState: SetState,
) {
    // paramStr = bankCode:acctNo:encodedAccountName:encodedBankName
    const [bankCode, bankAccountNo, encodedName, encodedBankName] = paramStr.split(':');
    const bankAccountName = decodeURIComponent(encodedName ?? '');
    const bankName = decodeURIComponent(encodedBankName ?? '');

    if (!bankCode || !bankAccountNo || !bankAccountName) {
        await sendTelegramMessage(chatId, `⚠️ Something went wrong. Type /payout to start over.`, 'none');
        return;
    }

    // Generate OTP and send to seller's email
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, displayName: true },
    });
    if (!user?.email) {
        await sendTelegramMessage(chatId, `⚠️ No email on your account. Update it in app settings first.`, 'none');
        return;
    }

    const code = await generateOtp(userId, 'ACCOUNT_UPDATE');
    const FROM = process.env.RESEND_FROM_EMAIL || 'DepMi <security@depmi.com>';

    await resend.emails.send({
        from: FROM,
        to: user.email,
        subject: 'DepMi — Confirm payout account change',
        html: `<p>Hi ${user.displayName},</p>
               <p>Your DepMi payout account is being updated to:</p>
               <p><strong>${bankAccountName}</strong> at ${bankName} (${bankAccountNo})</p>
               <p>Your verification code is: <strong style="font-size:24px;letter-spacing:4px">${code}</strong></p>
               <p>This code expires in 10 minutes. If you didn't request this, ignore this email.</p>`,
    }).catch(err => console.error('[bot/payout] Resend failed:', err));

    await setState(chatId, {
        step: 'payout_otp',
        storeId,
        userId,
        bankCode,
        bankAccountNo,
        bankAccountName,
    });

    await sendTelegramMessage(
        chatId,
        `📧 A 6-digit code has been sent to your email.\n\nEnter it here to confirm the payout account change:`,
        'none',
    );
}

// ─── Toggle dispatch ──────────────────────────────────────────────────────────

export async function handleDispatchToggle(chatId: number, storeId: string) {
    const store = await prisma.store.findUnique({
        where: { id: storeId },
        select: { dispatchEnabled: true },
    });
    if (!store) return;
    const next = !store.dispatchEnabled;
    await prisma.store.update({ where: { id: storeId }, data: { dispatchEnabled: next } });
    await sendTelegramMessage(chatId, next ? `🚛 DepMi Dispatch enabled.` : `🚛 DepMi Dispatch disabled.`, 'none');
    await sendSettingsMenu(chatId, storeId);
}
