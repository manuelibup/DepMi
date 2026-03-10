import { prisma } from '@/lib/prisma';
import { resend } from '@/lib/resend';

const BASE_URL = process.env.NEXTAUTH_URL || 'https://depmi.com';

async function sendSms(to: string, message: string) {
    if (!process.env.TERMII_API_KEY) return;
    try {
        await fetch('https://api.ng.termii.com/api/sms/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_key: process.env.TERMII_API_KEY,
                to,
                from: process.env.TERMII_SENDER_ID || 'DepMi',
                sms: message,
                type: 'plain',
                channel: 'generic',
            }),
        });
    } catch (err) {
        console.error('Termii SMS error:', err);
    }
}

/**
 * Called when a new product is listed. Finds all un-notified ProductWatch records
 * whose searchQuery matches the product title (keyword match), then sends
 * in-app, email, and SMS notifications.
 */
export async function notifySearchWatchers({
    productId,
    productTitle,
    productSlug,
    storeName,
    price,
    currency,
}: {
    productId: string;
    productTitle: string;
    productSlug: string;
    storeName: string;
    price: number;
    currency: string;
}) {
    const watches = await prisma.productWatch.findMany({
        where: { productId: null, notified: false },
        include: {
            user: {
                select: {
                    id: true,
                    email: true,
                    phoneNumber: true,
                    phoneVerified: true,
                    displayName: true,
                },
            },
        },
    });

    const titleWords = productTitle.toLowerCase().split(/\s+/);
    const matching = watches.filter((w) => {
        if (!w.searchQuery) return false;
        const queryWords = w.searchQuery.toLowerCase().split(/\s+/);
        return queryWords.some((word) => titleWords.some((tw) => tw.includes(word)));
    });

    if (matching.length === 0) return;

    const productUrl = `${BASE_URL}/p/${productSlug}`;
    const priceFormatted = `${currency}${Number(price).toLocaleString('en-NG')}`;

    await Promise.allSettled(
        matching.map(async (watch) => {
            const { user } = watch;

            await prisma.notification.create({
                data: {
                    userId: user.id,
                    type: 'PRODUCT_AVAILABLE',
                    title: 'Found it! 🛍️',
                    body: `${productTitle} by ${storeName} — ${priceFormatted}`,
                    link: `/p/${productSlug}`,
                    isRead: false,
                },
            });

            if (user.email) {
                resend.emails.send({
                    from: 'DepMi <noreply@depmi.com>',
                    to: user.email,
                    subject: `We found it: ${productTitle}`,
                    html: `
                        <div style="font-family:sans-serif;max-width:480px;margin:auto">
                            <h2 style="color:#00C853">Good news, ${user.displayName}!</h2>
                            <p>A product matching your search just dropped on DepMi:</p>
                            <h3 style="margin:0">${productTitle}</h3>
                            <p style="color:#666;margin:4px 0">by <strong>${storeName}</strong></p>
                            <p style="font-size:1.4rem;font-weight:bold;color:#111">${priceFormatted}</p>
                            <a href="${productUrl}" style="display:inline-block;background:#00C853;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:8px">View Product →</a>
                            <p style="margin-top:24px;color:#999;font-size:12px">You're receiving this because you set a watch on DepMi. <a href="${BASE_URL}/notifications">Manage alerts</a></p>
                        </div>
                    `,
                }).catch((err: unknown) => console.error('Resend error (search watch):', err));
            }

            if (user.phoneNumber && user.phoneVerified) {
                await sendSms(
                    user.phoneNumber,
                    `DepMi: "${productTitle}" by ${storeName} is now available for ${priceFormatted}. Check it out: ${productUrl}`,
                );
            }

            await prisma.productWatch.update({
                where: { id: watch.id },
                data: { notified: true },
            });
        }),
    );
}

/**
 * Called when a product is restocked (inStock: false → true). Finds all
 * ProductWatch records for that specific product and notifies each watcher.
 */
export async function notifyRestockWatchers({
    productId,
    productTitle,
    productSlug,
    storeName,
}: {
    productId: string;
    productTitle: string;
    productSlug: string;
    storeName: string;
}) {
    const watches = await prisma.productWatch.findMany({
        where: { productId, notified: false },
        include: {
            user: {
                select: {
                    id: true,
                    email: true,
                    phoneNumber: true,
                    phoneVerified: true,
                    displayName: true,
                },
            },
        },
    });

    if (watches.length === 0) return;

    const productUrl = `${BASE_URL}/p/${productSlug}`;

    await Promise.allSettled(
        watches.map(async (watch) => {
            const { user } = watch;

            await prisma.notification.create({
                data: {
                    userId: user.id,
                    type: 'PRODUCT_AVAILABLE',
                    title: 'Back in stock! ✅',
                    body: `${productTitle} by ${storeName} is available again.`,
                    link: `/p/${productSlug}`,
                    isRead: false,
                },
            });

            if (user.email) {
                resend.emails.send({
                    from: 'DepMi <noreply@depmi.com>',
                    to: user.email,
                    subject: `${productTitle} is back in stock!`,
                    html: `
                        <div style="font-family:sans-serif;max-width:480px;margin:auto">
                            <h2 style="color:#00C853">It's back, ${user.displayName}!</h2>
                            <p><strong>${productTitle}</strong> by <strong>${storeName}</strong> is back in stock on DepMi.</p>
                            <p style="color:#999;font-size:13px">Don't wait — stock may go fast.</p>
                            <a href="${productUrl}" style="display:inline-block;background:#00C853;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:8px">Buy Now →</a>
                            <p style="margin-top:24px;color:#999;font-size:12px">You're receiving this because you set a watch on DepMi. <a href="${BASE_URL}/notifications">Manage alerts</a></p>
                        </div>
                    `,
                }).catch((err: unknown) => console.error('Resend error (restock watch):', err));
            }

            if (user.phoneNumber && user.phoneVerified) {
                await sendSms(
                    user.phoneNumber,
                    `DepMi: "${productTitle}" by ${storeName} is back in stock! Grab it: ${productUrl}`,
                );
            }

            await prisma.productWatch.update({
                where: { id: watch.id },
                data: { notified: true },
            });
        }),
    );
}

/**
 * Called when an order status changes (PAID, SHIPPED, DELIVERED, COMPLETED).
 * Sends an email to the relevant party (buyer or seller).
 */
export async function notifyOrderUpdate({
    orderId,
    status,
    userId,
    userName,
    userEmail,
    productTitle,
    amount,
    link,
}: {
    orderId: string;
    status: string;
    userId: string;
    userName: string;
    userEmail: string;
    productTitle: string;
    amount?: number;
    link: string;
}) {
    const shortId = orderId.slice(-6).toUpperCase();
    let subject = '';
    let headline = '';
    let body = '';
    let buttonText = 'View Order';

    switch (status) {
        case 'NEW_ORDER':
            subject = `New order #${shortId} — action required`;
            headline = `You've got an order, ${userName}!`;
            body = `A buyer just purchased <strong>${productTitle}</strong>${amount ? ` for <strong>₦${amount.toLocaleString()}</strong>` : ''}. Funds are held in escrow — prepare to ship!`;
            buttonText = 'View Order';
            break;
        case 'PAID':
            subject = `Order #${shortId} confirmed!`;
            headline = `Payment received, ${userName}!`;
            body = `Good news! Your payment for <strong>${productTitle}</strong> was successful. The seller has been notified to ship your item.`;
            break;
        case 'SHIPPED':
            subject = `Your order #${shortId} is on the way!`;
            headline = `It's coming, ${userName}!`;
            body = `The seller has shipped <strong>${productTitle}</strong>. You can track your package in your dashboard.`;
            buttonText = 'Track Order';
            break;
        case 'DELIVERED':
            subject = `Order #${shortId} has arrived!`;
            headline = `Package delivered!`;
            body = `Your order for <strong>${productTitle}</strong> has been marked as delivered. Please confirm receipt to release funds to the seller.`;
            buttonText = 'Confirm Receipt';
            break;
        case 'COMPLETED':
            subject = `Payment released for Order #${shortId}`;
            headline = `Funds are here, ${userName}!`;
            body = `The buyer has confirmed receipt of <strong>${productTitle}</strong>. ₦${amount?.toLocaleString()} has been sent to your bank account.`;
            break;
        default:
            return;
    }

    try {
        await resend.emails.send({
            from: 'DepMi <noreply@depmi.com>',
            to: userEmail,
            subject,
            html: `
                <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:20px;border:1px solid #eee;border-radius:12px">
                    <h2 style="color:#111;margin-top:0">${headline}</h2>
                    <p style="color:#444;line-height:1.6">${body}</p>
                    <div style="margin:24px 0;padding:16px;background:#f9f9f9;border-radius:8px">
                        <p style="margin:0;font-size:0.85rem;color:#777">Order ID</p>
                        <p style="margin:4px 0 0;font-weight:bold;font-family:monospace">#${shortId}</p>
                    </div>
                    <a href="${BASE_URL}${link}" style="display:inline-block;background:#FFD700;color:#000;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold">${buttonText} →</a>
                    <hr style="margin:30px 0;border:none;border-top:1px solid #eee" />
                    <p style="color:#999;font-size:12px;text-align:center">DepMi Escrow — Secure Social Commerce</p>
                </div>
            `,
        });
    } catch (err) {
        console.error('Resend error (order update):', err);
    }
}
