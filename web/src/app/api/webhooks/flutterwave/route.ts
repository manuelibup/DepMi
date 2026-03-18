import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateWebhookSignature } from '@/lib/flutterwave'
import { notifyOrderUpdate } from '@/lib/notifyWatchers'

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
        })
    } catch (err) {
        console.error('[flutterwave-webhook] DB error:', err)
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
