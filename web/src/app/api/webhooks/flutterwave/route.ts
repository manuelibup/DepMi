// DEPRECATED — Flutterwave removed. Payment rail migrated to Paystack.
// New webhook: https://depmi.com/api/webhooks/paystack
// Disable this endpoint in the Flutterwave dashboard to stop receiving events here.

import { NextResponse } from 'next/server'

export async function POST() {
    return NextResponse.json({ ok: false, message: 'Flutterwave integration removed' }, { status: 410 })
}

/*
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateWebhookSignature } from '@/lib/flutterwave'
import { notifyOrderUpdate, sendOrderAutoDM } from '@/lib/notifyWatchers'
import { notifyWhatsAppNewOrder } from '@/lib/whatsapp'
import { bookShipment } from '@/lib/shipbubble'

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

    if (payload.event !== 'charge.completed' || payload.data?.status !== 'successful') {
        return NextResponse.json({ ok: true })
    }

    const { tx_ref, id: transactionId, amount } = payload.data
    let orderId = tx_ref?.replace('depmi-order-', '')

    if (!orderId) {
        console.error('[flutterwave-webhook] Could not parse orderId from', tx_ref)
        return NextResponse.json({ ok: true })
    }

    let confirmedOrder: { storeId: string; storeName: string; productTitle: string; storeSlug: string; buyerId: string; sellerOwnerId: string; sellerPhone: string | null; totalAmount: number } | null = null

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

            if (!order) { console.error('[flutterwave-webhook] Order not found:', orderId); return }
            if (order.status === 'CONFIRMED' || order.paystackRef === tx_ref) return
            if (order.escrowStatus !== 'HELD' || order.status !== 'PENDING') return

            const platformFeeNgn = order.platformFeeNgn || 0
            await tx.order.update({ where: { id: orderId }, data: { status: 'CONFIRMED', escrowStatus: 'HELD', paystackRef: tx_ref, platformFeeNgn } })

            for (const item of order.items) {
                if (!item.product) continue
                const newStock = Math.max(0, (item.product.stock || 1) - item.quantity)
                await tx.product.update({ where: { id: item.productId }, data: { stock: newStock, inStock: newStock > 0 } })
            }

            const isDigitalOrder = order.isDigital || (order.items[0]?.product?.isDigital ?? false)
            const variantSuffix = order.items[0]?.variantName ? ` — ${order.items[0].variantName}` : ''
            await tx.notification.create({ data: { userId: order.seller.ownerId, type: 'ORDER_CONFIRMED', title: 'New order payment received', body: isDigitalOrder ? `Order #${orderId.slice(-6).toUpperCase()} paid${variantSuffix} (₦${Number(order.totalAmount).toLocaleString()}). Digital product — escrow auto-releases in 48h.` : `Order #${orderId.slice(-6).toUpperCase()} paid${variantSuffix} (₦${Number(order.totalAmount).toLocaleString()}). Prepare to ship.`, link: '/orders' } })

            if (order.buyer.email) {
                await notifyOrderUpdate({ orderId, status: 'PAID', userId: order.buyer.id, userName: order.buyer.displayName, userEmail: order.buyer.email, productTitle: order.items[0]?.product.title || 'Product', link: '/orders' })
            }

            confirmedOrder = { storeId: order.seller.id, storeName: order.seller.name, productTitle: order.items[0]?.product?.title ?? 'a product', storeSlug: order.seller.slug, buyerId: order.buyer.id, sellerOwnerId: order.seller.ownerId, sellerPhone: (order.seller.owner as { phoneNumber?: string | null }).phoneNumber ?? null, totalAmount: Number(order.totalAmount) }

            if (!isDigitalOrder && order.seller.dispatchEnabled && order.shipbubbleReqToken) {
                try {
                    const booking = await bookShipment(order.shipbubbleReqToken)
                    await tx.order.update({ where: { id: orderId }, data: { dispatchOrderId: booking.shipbubbleOrderId, dispatchProvider: 'shipbubble/gigl', trackingNo: booking.trackingUrl ?? booking.trackingCode ?? null, status: 'SHIPPED' } })
                    await tx.notification.create({ data: { userId: order.seller.ownerId, type: 'ORDER_CONFIRMED', title: 'Dispatch booked automatically', body: `A GIG Logistics rider has been booked for order #${orderId.slice(-6).toUpperCase()}. Prepare the package for pickup.`, link: '/orders' } })
                } catch (dispatchErr) {
                    console.error('[flutterwave-webhook] Dispatch booking failed:', dispatchErr)
                }
            }
        })
    } catch (err) {
        console.error('[flutterwave-webhook] DB error:', err)
    }

    type ConfirmedOrderData = { storeId: string; storeName: string; productTitle: string; storeSlug: string; buyerId: string; sellerOwnerId: string; sellerPhone: string | null; totalAmount: number }
    const finalOrder = confirmedOrder as ConfirmedOrderData | null
    if (finalOrder) {
        void sendOrderAutoDM(finalOrder.buyerId, finalOrder.sellerOwnerId, orderId)
        if (finalOrder.sellerPhone) { void notifyWhatsAppNewOrder(finalOrder.sellerPhone, orderId.slice(-6).toUpperCase(), finalOrder.productTitle, finalOrder.totalAmount) }
        const { storeId, storeName, productTitle, storeSlug } = finalOrder
        try {
            const followers = await prisma.storeFollow.findMany({ where: { storeId }, select: { userId: true }, take: 100 })
            if (followers.length > 0) { await prisma.notification.createMany({ data: followers.map(f => ({ userId: f.userId, type: 'STORE_FOLLOW_SALE' as const, title: `Someone just bought from ${storeName}`, body: `"${productTitle}" was just purchased — check out what else is available.`, link: `/store/${storeSlug}` })), skipDuplicates: true }) }
        } catch (err) { console.error('[flutterwave-webhook] Social notification error:', err) }
    }

    return NextResponse.json({ ok: true })
}

interface FlutterwaveWebhookPayload {
    event: string
    data?: { id: number; tx_ref: string; flw_ref: string; amount: number; currency: string; status: string; customer: { email: string; name: string } }
}
*/
