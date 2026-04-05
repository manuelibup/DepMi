import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { initiatePayout } from '@/lib/flutterwave';
import { sendPushToUser } from '@/lib/webpush';

const DIGITAL_ESCROW_HOURS = 48;

/**
 * GET /api/cron/auto-release-digital
 * Called by cron-job.org every hour.
 * Auto-completes digital orders that have been CONFIRMED for ≥48h with no dispute.
 * Replicates the confirm-route payout logic without requiring buyer OTP.
 */
export async function GET(req: NextRequest) {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cutoff = new Date(Date.now() - DIGITAL_ESCROW_HOURS * 60 * 60 * 1000);

    // Find all CONFIRMED digital orders older than 48h with no dispute
    const orders = await prisma.order.findMany({
        where: {
            isDigital: true,
            status: 'CONFIRMED',
            escrowStatus: 'HELD',
            updatedAt: { lt: cutoff },
        },
        include: {
            seller: { include: { owner: true } },
            buyer: { select: { id: true, displayName: true, email: true } },
            items: { include: { product: { select: { title: true } } }, take: 1 },
        },
    });

    let released = 0;
    let failed = 0;

    for (const order of orders) {
        try {
            const totalAmount = Number(order.totalAmount);
            const feeWaived = order.seller.feeWaiverUntil && order.seller.feeWaiverUntil > new Date();
            const platformFee = feeWaived ? 0 : Math.round(totalAmount * 0.03 * 100) / 100;
            const sellerAmount = Math.round((totalAmount - platformFee) * 100) / 100;

            // If seller has no bank details, mark completed but flag for manual payout
            if (!order.seller.bankCode || !order.seller.bankAccountNo) {
                await prisma.$transaction(async (tx) => {
                    await tx.order.update({
                        where: { id: order.id },
                        data: { status: 'COMPLETED', escrowStatus: 'RELEASING', platformFeeNgn: platformFee },
                    });
                    await tx.notification.create({
                        data: {
                            userId: order.seller.ownerId,
                            type: 'PAYMENT_RELEASED',
                            title: 'Add bank details to receive payment',
                            body: `Digital order #${order.id.slice(-6).toUpperCase()} completed. Add your bank account in Settings to receive ₦${sellerAmount.toLocaleString()}.`,
                            link: `/store/${order.seller.slug}/settings`,
                        },
                    });
                });
                released++;
                continue;
            }

            // Mark as releasing
            await prisma.order.update({
                where: { id: order.id },
                data: { status: 'DELIVERED', escrowStatus: 'RELEASING', platformFeeNgn: platformFee },
            });

            // Initiate payout
            await initiatePayout({
                amount: sellerAmount,
                bankCode: order.seller.bankCode,
                accountNumber: order.seller.bankAccountNo,
                accountName: order.seller.bankAccountName ?? order.seller.name,
                narration: `DepMi digital payout - Order #${order.id.slice(-6).toUpperCase()}`,
                reference: `payout-${order.id}`,
            });

            // Finalize: COMPLETED + award Deps + notify
            await prisma.$transaction(async (tx) => {
                await tx.order.update({
                    where: { id: order.id },
                    data: { status: 'COMPLETED', escrowStatus: 'RELEASED' },
                });

                await tx.user.update({
                    where: { id: order.buyerId },
                    data: { depCount: { increment: 1 } },
                });
                await tx.depTransaction.create({
                    data: {
                        userId: order.buyerId,
                        amount: 1,
                        reason: `Digital purchase completed — Order #${order.id.slice(-6).toUpperCase()}`,
                        orderId: order.id,
                    },
                });

                await tx.store.update({
                    where: { id: order.sellerId },
                    data: { depCount: { increment: 1 } },
                });
                await tx.depTransaction.create({
                    data: {
                        storeId: order.sellerId,
                        amount: 1,
                        reason: `Digital sale completed — Order #${order.id.slice(-6).toUpperCase()}`,
                        orderId: order.id,
                    },
                });

                await tx.notification.create({
                    data: {
                        userId: order.seller.ownerId,
                        type: 'PAYMENT_RELEASED',
                        title: 'Digital sale payment released',
                        body: `₦${sellerAmount.toLocaleString()} for Order #${order.id.slice(-6).toUpperCase()} is on its way to your account.`,
                        link: '/orders',
                    },
                });

                await tx.notification.create({
                    data: {
                        userId: order.buyerId,
                        type: 'ORDER_CONFIRMED',
                        title: 'Digital order completed',
                        body: `Your 48h window has passed. Order #${order.id.slice(-6).toUpperCase()} is now complete.`,
                        link: '/orders',
                    },
                });
            });

            sendPushToUser(order.seller.ownerId, {
                title: 'Digital Payment Released',
                body: `₦${sellerAmount.toLocaleString()} for Order #${order.id.slice(-6).toUpperCase()} sent to your bank`,
                url: '/orders',
                tag: `order-paid-${order.id}`,
            }).catch(() => {});

            released++;
        } catch (err) {
            console.error(`[auto-release-digital] Failed for order ${order.id}:`, err);
            // Revert to CONFIRMED so it retries next hour
            await prisma.order.update({
                where: { id: order.id },
                data: { status: 'CONFIRMED', escrowStatus: 'HELD' },
            }).catch(() => {});
            failed++;
        }
    }

    console.log(`[auto-release-digital] Released: ${released}, Failed: ${failed}, Cutoff: ${cutoff.toISOString()}`);
    return NextResponse.json({ released, failed, cutoff: cutoff.toISOString() });
}
