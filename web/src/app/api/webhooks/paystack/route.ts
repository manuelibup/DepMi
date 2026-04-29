import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateWebhookSignature } from '@/lib/paystack'
import { notifyOrderUpdate, sendOrderAutoDM } from '@/lib/notifyWatchers'
import { notifyUserTelegram } from '@/lib/bot/notify'
import { notifyWhatsAppNewOrder } from '@/lib/whatsapp'
import { bookShipment } from '@/lib/shipbubble'

/**
 * Paystack payment webhook.
 * Handles async payment confirmations as a fallback to the redirect callback.
 *
 * Security: validates x-paystack-signature HMAC-SHA512 before touching the DB.
 * Idempotent: re-delivery of same reference is a no-op.
 *
 * Webhook URL to register in Paystack dashboard → Settings → API Keys & Webhooks:
 *   https://depmi.com/api/webhooks/paystack
 */
export async function POST(req: NextRequest) {
    let rawBody: string
    try {
        rawBody = await req.text()
    } catch {
        return NextResponse.json({ ok: false }, { status: 400 })
    }

    const signature = req.headers.get('x-paystack-signature') ?? ''
    if (!signature || !validateWebhookSignature(rawBody, signature)) {
        console.error('[paystack-webhook] Invalid or missing signature')
        return NextResponse.json({ ok: false }, { status: 401 })
    }

    let payload: PaystackWebhookPayload
    try {
        payload = JSON.parse(rawBody)
    } catch {
        return NextResponse.json({ ok: false }, { status: 400 })
    }

    // Only handle successful charges
    if (payload.event !== 'charge.success' || payload.data?.status !== 'success') {
        return NextResponse.json({ ok: true })
    }

    const { reference, amount: amountKobo } = payload.data
    // amount from Paystack is in kobo — convert to NGN for logging only
    void amountKobo

    let orderId = reference?.replace('depmi-order-', '')
    if (!orderId) {
        console.error('[paystack-webhook] Could not parse orderId from reference:', reference)
        return NextResponse.json({ ok: true })
    }

    type ConfirmedOrderData = {
        storeId: string
        storeName: string
        productTitle: string
        storeSlug: string
        buyerId: string
        sellerOwnerId: string
        sellerPhone: string | null
        totalAmount: number
        isDigital: boolean
    }
    // eslint-disable-next-line prefer-const
    let confirmedOrder: ConfirmedOrderData | null = null

    try {
        await prisma.$transaction(async (tx) => {
            let order = await tx.order.findUnique({
                where: { id: orderId },
                include: {
                    seller: { include: { owner: true } },
                    buyer: true,
                    items: { include: { product: true }, take: 1 },
                },
            })

            // Fallback: search by paystackRef in case orderId parse differs
            if (!order) {
                order = await tx.order.findFirst({
                    where: { OR: [{ id: reference }, { paystackRef: reference }] },
                    include: {
                        seller: { include: { owner: true } },
                        buyer: true,
                        items: { include: { product: true }, take: 1 },
                    },
                })
                if (order) orderId = order.id
            }

            if (!order) {
                console.error('[paystack-webhook] Order not found:', orderId)
                return
            }

            // Idempotency
            if (order.status === 'CONFIRMED' || order.paystackRef === reference) return
            if (order.escrowStatus !== 'HELD' || order.status !== 'PENDING') return

            const platformFeeNgn = order.platformFeeNgn || 0

            await tx.order.update({
                where: { id: orderId },
                data: {
                    status: 'CONFIRMED',
                    escrowStatus: 'HELD',
                    paystackRef: reference,
                    platformFeeNgn,
                },
            })

            // Decrement product stock
            for (const item of order.items) {
                if (!item.product) continue
                const newStock = Math.max(0, (item.product.stock || 1) - item.quantity)
                await tx.product.update({
                    where: { id: item.productId },
                    data: { stock: newStock, inStock: newStock > 0 },
                })
            }

            const isDigitalOrder = order.isDigital || (order.items[0]?.product?.isDigital ?? false)
            const variantName = order.items[0]?.variantName
            const variantSuffix = variantName ? ` — ${variantName}` : ''

            await tx.notification.create({
                data: {
                    userId: order.seller.ownerId,
                    type: 'ORDER_CONFIRMED',
                    title: 'New order payment received',
                    body: isDigitalOrder
                        ? `Order #${orderId.slice(-6).toUpperCase()} paid${variantSuffix} (₦${Number(order.totalAmount).toLocaleString()}). Digital product — escrow auto-releases in 48h.`
                        : `Order #${orderId.slice(-6).toUpperCase()} paid${variantSuffix} (₦${Number(order.totalAmount).toLocaleString()}). Prepare to ship.`,
                    link: '/orders',
                },
            })

            if (order.buyer.email) {
                await notifyOrderUpdate({
                    orderId,
                    status: 'PAID',
                    userId: order.buyer.id,
                    userName: order.buyer.displayName,
                    userEmail: order.buyer.email,
                    productTitle: order.items[0]?.product.title || 'Product',
                    link: isDigitalOrder ? `/read/${orderId}` : '/orders',
                    isDigital: isDigitalOrder,
                })
            }

            confirmedOrder = {
                storeId: order.seller.id,
                storeName: order.seller.name,
                productTitle: order.items[0]?.product?.title ?? 'a product',
                storeSlug: order.seller.slug,
                buyerId: order.buyer.id,
                sellerOwnerId: order.seller.ownerId,
                sellerPhone: (order.seller.owner as { phoneNumber?: string | null }).phoneNumber ?? null,
                totalAmount: Number(order.totalAmount),
                isDigital: isDigitalOrder,
            }

            // Auto-book dispatch if store has DepMi Dispatch enabled (skip for digital)
            if (!isDigitalOrder && order.seller.dispatchEnabled && order.shipbubbleReqToken) {
                try {
                    const booking = await bookShipment(order.shipbubbleReqToken)
                    await tx.order.update({
                        where: { id: orderId },
                        data: {
                            dispatchOrderId: booking.shipbubbleOrderId,
                            dispatchProvider: 'shipbubble/gigl',
                            trackingNo: booking.trackingUrl ?? booking.trackingCode ?? null,
                            status: 'SHIPPED',
                        },
                    })
                    await tx.notification.create({
                        data: {
                            userId: order.seller.ownerId,
                            type: 'ORDER_CONFIRMED',
                            title: 'Dispatch booked automatically',
                            body: `A GIG Logistics rider has been booked for order #${orderId.slice(-6).toUpperCase()}. Prepare the package for pickup.`,
                            link: '/orders',
                        },
                    })
                } catch (dispatchErr) {
                    // Don't fail payment confirmation — seller can ship manually
                    console.error('[paystack-webhook] Dispatch booking failed:', dispatchErr)
                }
            }
        })
    } catch (err) {
        console.error('[paystack-webhook] DB error:', err)
    }

    // Fire social notifications + auto-DM after transaction — never block payment confirmation
    // TypeScript can't track assignment inside async closure — double-cast.
    const finalOrder = confirmedOrder as unknown as ConfirmedOrderData | null
    if (finalOrder) {
        void sendOrderAutoDM(finalOrder.buyerId, finalOrder.sellerOwnerId, orderId)
        void notifyUserTelegram(
            finalOrder.buyerId,
            finalOrder.isDigital
                ? `✅ <b>Payment confirmed!</b>\n\n📖 <b>${finalOrder.productTitle}</b> is ready to read on DepMi.`
                : `✅ <b>Payment confirmed!</b>\n\n🛍 <b>${finalOrder.productTitle}</b> has been paid. The seller will prepare your item shortly.`,
            finalOrder.isDigital
                ? [{ text: '📖 Read Now', url: `${process.env.NEXTAUTH_URL ?? 'https://depmi.com'}/read/${orderId}` }]
                : [{ text: '📦 View Order', url: `${process.env.NEXTAUTH_URL ?? 'https://depmi.com'}/orders` }],
        )

        if (finalOrder.sellerPhone) {
            void notifyWhatsAppNewOrder(
                finalOrder.sellerPhone,
                orderId.slice(-6).toUpperCase(),
                finalOrder.productTitle,
                finalOrder.totalAmount,
            )
        }

        const { storeId, storeName, productTitle, storeSlug } = finalOrder
        try {
            const followers = await prisma.storeFollow.findMany({
                where: { storeId },
                select: { userId: true },
                take: 100,
            })
            if (followers.length > 0) {
                await prisma.notification.createMany({
                    data: followers.map(f => ({
                        userId: f.userId,
                        type: 'STORE_FOLLOW_SALE' as const,
                        title: `Someone just bought from ${storeName}`,
                        body: `"${productTitle}" was just purchased — check out what else is available.`,
                        link: `/${storeSlug}`,
                    })),
                    skipDuplicates: true,
                })
            }
        } catch (err) {
            console.error('[paystack-webhook] Social notification error:', err)
        }
    }

    return NextResponse.json({ ok: true })
}

interface PaystackWebhookPayload {
    event: string
    data?: {
        reference: string
        amount: number  // kobo
        status: string  // 'success' | 'failed'
        currency: string
        customer: {
            email: string
            first_name?: string
            last_name?: string
        }
        metadata?: {
            orderId?: string
        }
    }
}
