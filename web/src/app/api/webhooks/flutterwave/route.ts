import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateWebhookSignature } from '@/lib/flutterwave'
import { notifyOrderUpdate, sendOrderAutoDM } from '@/lib/notifyWatchers'
import { bookShipment } from '@/lib/shipbubble'

/**
 * Flutterwave payment webhook.
 * Handles async payment confirmations as a fallback to the redirect callback.
 *
 * Security: validates verif-hash header before touching the DB.
 * Idempotent: re-delivery of same tx_ref is a no-op.
 */
export async function POST(req: NextRequest) {
    const signature = req.headers.get('verif-hash') ?? ''
    if (!signature || !validateWebhookSignature(signature)) {
        console.error('[flutterwave-webhook] Invalid or missing signature')
        return NextResponse.json({ ok: false }, { status: 401 })
    }

    let payload: FlutterwaveWebhookPayload
    try {
        payload = await req.json()
    } catch {
        return NextResponse.json({ ok: false }, { status: 400 })
    }

    // Only handle successful charges
    if (payload.event !== 'charge.completed' || payload.data?.status !== 'successful') {
        return NextResponse.json({ ok: true })
    }

    const { tx_ref, id: transactionId, amount } = payload.data
    let orderId = tx_ref?.replace('depmi-order-', '')

    if (!orderId) {
        console.error('[flutterwave-webhook] Could not parse orderId from', tx_ref)
        return NextResponse.json({ ok: true })
    }

    let confirmedOrder: { storeId: string; storeName: string; productTitle: string; storeSlug: string; buyerId: string; sellerOwnerId: string } | null = null

    try {
        await prisma.$transaction(async (tx) => {
            let order = await tx.order.findUnique({
                where: { id: orderId },
                include: {
                    seller: { include: { owner: true } },
                    buyer: true,
                    items: { include: { product: true }, take: 1 }
                },
            })


            // Fallback for different txRef formats or IDs
            if (!order) {
                order = await tx.order.findFirst({
                    where: { OR: [{ id: tx_ref }, { paystackRef: tx_ref }] },
                    include: {
                        seller: { include: { owner: true } },
                        buyer: true,
                        items: { include: { product: true }, take: 1 }
                    },
                })
                if (order) orderId = order.id
            }

            if (!order) {
                console.error('[flutterwave-webhook] Order not found:', orderId)
                return
            }

            // Idempotency
            if (order.status === 'CONFIRMED' || order.paystackRef === tx_ref) return
            if (order.escrowStatus !== 'HELD' || order.status !== 'PENDING') return

            const platformFeeNgn = Math.round(Number(order.totalAmount) * 0.05 * 100) / 100

            await tx.order.update({
                where: { id: orderId },
                data: {
                    status: 'CONFIRMED',
                    escrowStatus: 'HELD',
                    paystackRef: tx_ref,
                    platformFeeNgn,
                },
            })

            // Decrement product stock
            for (const item of order.items) {
                if (!item.product) continue;

                const currentStock = item.product.stock || 1;
                const newStock = Math.max(0, currentStock - item.quantity);

                await tx.product.update({
                    where: { id: item.productId },
                    data: {
                        stock: newStock,
                        inStock: newStock > 0
                    }
                });
            }

            await tx.notification.create({
                data: {
                    userId: order.seller.ownerId,
                    type: 'ORDER_CONFIRMED',
                    title: 'New order payment received',
                    body: `Order #${orderId.slice(-6).toUpperCase()} has been paid (₦${Number(order.totalAmount).toLocaleString()}). Prepare to ship.`,
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
                    link: '/orders'
                })
            }

            // Capture for post-transaction notifications
            confirmedOrder = {
                storeId: order.seller.id,
                storeName: order.seller.name,
                productTitle: order.items[0]?.product?.title ?? 'a product',
                storeSlug: order.seller.slug,
                buyerId: order.buyer.id,
                sellerOwnerId: order.seller.ownerId,
            }

            // Auto-book dispatch if store has DepMi Dispatch enabled and quote token saved
            if (order.seller.dispatchEnabled && order.shipbubbleReqToken) {
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
                    console.error('[flutterwave-webhook] Dispatch booking failed:', dispatchErr)
                }
            }
        })
        // Auto-DM the seller with the order card (fire-and-forget, non-blocking)
        if (confirmedOrder) {
            void sendOrderAutoDM(confirmedOrder.buyerId, confirmedOrder.sellerOwnerId, orderId)
        }
    } catch (err) {
        console.error('[flutterwave-webhook] DB error:', err)
    }

    // Fire social notifications after transaction — never block payment confirmation
    if (confirmedOrder) {
        const { storeId, storeName, productTitle, storeSlug } = confirmedOrder
        try {
            // Notify store followers: "Someone just bought X from [Store]"
            const followers = await prisma.storeFollow.findMany({
                where: { storeId },
                select: { userId: true },
                take: 100, // cap per-order fan-out
            })
            if (followers.length > 0) {
                await prisma.notification.createMany({
                    data: followers.map(f => ({
                        userId: f.userId,
                        type: 'STORE_FOLLOW_SALE' as const,
                        title: `Someone just bought from ${storeName}`,
                        body: `"${productTitle}" was just purchased — check out what else is available.`,
                        link: `/store/${storeSlug}`,
                    })),
                    skipDuplicates: true,
                })
            }
        } catch (err) {
            console.error('[flutterwave-webhook] Social notification error:', err)
        }
    }

    return NextResponse.json({ ok: true })
}

interface FlutterwaveWebhookPayload {
    event: string
    data?: {
        id: number
        tx_ref: string
        flw_ref: string
        amount: number
        currency: string
        status: string
        customer: {
            email: string
            name: string
        }
    }
}
