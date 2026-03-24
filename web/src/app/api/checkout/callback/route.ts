import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyTransaction } from '@/lib/flutterwave'
import { notifyOrderUpdate, sendOrderAutoDM } from '@/lib/notifyWatchers'

/**
 * GET /api/checkout/callback
 * Flutterwave redirects here after buyer pays.
 * Verifies the transaction and redirects buyer to /orders.
 *
 * Query params: status, tx_ref, transaction_id
 */
export async function GET(req: NextRequest) {
    const { searchParams } = req.nextUrl
    const status = searchParams.get('status')
    const txRef = searchParams.get('tx_ref')
    const transactionId = searchParams.get('transaction_id')

    const baseUrl = process.env.NEXTAUTH_URL ?? 'https://depmi.com'

    if (status !== 'successful' || !txRef || !transactionId) {
        return NextResponse.redirect(`${baseUrl}/orders?payment=cancelled`)
    }

    try {
        // Verify with Flutterwave
        const result = await verifyTransaction(transactionId)

        if (!result.paid) {
            return NextResponse.redirect(`${baseUrl}/orders?payment=failed`)
        }

        // Find order by tx_ref (format: depmi-order-{orderId})
        const orderId = txRef.replace('depmi-order-', '')
        let order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                seller: { include: { owner: true } },
                buyer: true,
                items: { include: { product: true }, take: 1 }
            },
        })

        // Fallback: search by paystackRef in case txRef format differs
        if (!order) {
            order = await prisma.order.findFirst({
                where: { paystackRef: txRef },
                include: {
                    seller: { include: { owner: true } },
                    buyer: true,
                    items: { include: { product: true }, take: 1 }
                },
            })
        }

        if (!order) {
            console.error('[checkout/callback] Order not found for txRef:', txRef)
            return NextResponse.redirect(`${baseUrl}/orders?payment=failed`)
        }


        // Idempotency check
        if (order.status === 'CONFIRMED') {
            return NextResponse.redirect(`${baseUrl}/orders?success=true&orderId=${orderId}`)
        }

        const platformFeeNgn = Math.round(Number(order.totalAmount) * 0.05 * 100) / 100

        await prisma.$transaction(async (tx) => {
            await tx.order.update({
                where: { id: orderId },
                data: {
                    status: 'CONFIRMED',
                    escrowStatus: 'HELD',
                    paystackRef: txRef,
                    platformFeeNgn,
                },
            })

            await tx.notification.create({
                data: {
                    userId: order.seller.ownerId,
                    type: 'ORDER_CONFIRMED',
                    title: 'New order payment received',
                    body: `Order #${orderId.slice(-6).toUpperCase()} has been paid (₦${Number(order.totalAmount).toLocaleString()}). Prepare to ship.`,
                    link: '/orders',
                },
            })
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

        const sellerOwner = order.seller.owner
        if (sellerOwner?.email) {
            void notifyOrderUpdate({
                orderId,
                status: 'NEW_ORDER',
                userId: sellerOwner.id,
                userName: sellerOwner.displayName,
                userEmail: sellerOwner.email,
                productTitle: order.items[0]?.product.title || 'Product',
                amount: Number(order.totalAmount),
                link: '/orders'
            })
        }

        // Auto-DM: sends [order:id] card into buyer↔seller conversation
        void sendOrderAutoDM(order.buyer.id, order.seller.ownerId, orderId)

        return NextResponse.redirect(`${baseUrl}/orders?success=true&orderId=${orderId}`)
    } catch (err) {
        console.error('[checkout/callback] Error:', err)
        return NextResponse.redirect(`${baseUrl}/orders?payment=failed`)
    }
}
