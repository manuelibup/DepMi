import { prisma } from './prisma';

/** Generate a unique referral code for a user. Idempotent — returns existing code if already created. */
export async function generateReferralCode(userId: string): Promise<string> {
    const existing = await prisma.referralCode.findUnique({ where: { userId } });
    if (existing) return existing.code;

    let code: string;
    let attempts = 0;
    do {
        const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
        code = `DEP-${rand}`;
        attempts++;
        if (attempts > 10) throw new Error('Failed to generate unique referral code');
    } while (await prisma.referralCode.findUnique({ where: { code } }));

    await prisma.referralCode.create({ data: { userId, code } });
    return code;
}

/**
 * Called at registration when a ?ref=CODE param is present.
 * Non-blocking — should always be wrapped in try/catch by caller.
 */
export async function captureReferral(referredUserId: string, code: string): Promise<void> {
    const config = await prisma.referralConfig.findUnique({ where: { id: 'singleton' } });
    if (!config?.globalEnabled) return;

    const referralCode = await prisma.referralCode.findUnique({
        where: { code: code.toUpperCase() },
    });

    if (!referralCode || !referralCode.perUserEnabled) return;
    if (referralCode.userId === referredUserId) return; // prevent self-referral

    // Check validity window
    const expiry = new Date(referralCode.createdAt.getTime() + config.durationDays * 86400 * 1000);
    if (new Date() > expiry) return;

    // Prevent duplicate referral transactions for the same user
    const existing = await prisma.referralTransaction.findFirst({
        where: { referredUserId },
    });
    if (existing) return;

    await prisma.referralTransaction.create({
        data: {
            referralCodeId: referralCode.id,
            referrerId: referralCode.userId,
            referredUserId,
            rewardAmount: 0, // filled when qualified
            status: 'PENDING',
        },
    });
}

/**
 * Called when an order moves to COMPLETED status.
 * Qualifies any pending referral for the buyer and calculates the reward.
 */
export async function qualifyReferral(referredUserId: string, orderId: string, orderAmount: number): Promise<void> {
    const config = await prisma.referralConfig.findUnique({ where: { id: 'singleton' } });
    if (!config?.globalEnabled) return;

    const pending = await prisma.referralTransaction.findFirst({
        where: { referredUserId, status: 'PENDING' },
    });
    if (!pending) return;

    const rewardAmount = (orderAmount * config.rewardPercentage) / 100;

    await prisma.referralTransaction.update({
        where: { id: pending.id },
        data: { orderId, rewardAmount, status: 'QUALIFIED' },
    });

    // Trigger payout (stub — Phase 4: wire to Flutterwave transfer API)
    void initiateReferralPayout(pending.referrerId, rewardAmount).catch(err =>
        console.error('[Referral] Payout stub failed:', err)
    );
}

/**
 * STUB: Initiate referral reward payout via Flutterwave.
 * Phase 4: Replace with actual Flutterwave transfer call using referrer's bank details.
 */
async function initiateReferralPayout(referrerId: string, amount: number): Promise<void> {
    console.log(`[Referral] Payout stub — referrerId: ${referrerId}, amount: ₦${amount.toFixed(2)}`);
    // TODO Phase 4:
    // const referrer = await prisma.user.findUnique({ where: { id: referrerId }, include: { stores: true } });
    // await flutterwave.initiateTransfer({ accountNumber, bankCode, amount, narration: 'DepMi Referral Reward' });
    // await prisma.referralTransaction.updateMany({ where: { referrerId, status: 'QUALIFIED' }, data: { status: 'PAID' } });
}
