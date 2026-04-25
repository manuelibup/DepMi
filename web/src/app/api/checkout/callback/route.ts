import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyTransaction } from '@/lib/paystack'
import { notifyOrderUpdate, sendOrderAutoDM } from '@/lib/notifyWatchers'

/**
 * GET /api/checkout/callback
 * Paystack redirects here after buyer pays.
 * Verifies the transaction and redirects buyer to /orders.
 *
 * Query params: reference (trxref is identical — only reference needed)
 */
export async function GET(req: NextRequest) {
    const { searchParams } = req.nextUrl
    const reference = searchParams.get('reference') ?? searchParams.get('trxref')

    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://depmi.com'

    if (!reference) {
        return NextResponse.redirect(`${baseUrl}/orders?payment=cancelled`)
    }

    try {
        // Verify with Paystack
        const result = await verifyTransaction(reference)

        if (!result.paid) {
            return NextResponse.redirect(`${baseUrl}/orders?payment=failed`)
        }

        // Find order by reference (format: depmi-order-{orderId})
        const orderId = reference.replace('depmi-order-', '')
        let order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                seller: { include: { owner: true } },
                buyer: true,
                items: { include: { product: true }, take: 1 },
            },
        })

        // Fallback: search by paystackRef in case reference format differs
        if (!order) {
            order = await prisma.order.findFirst({
                where: { paystackRef: reference },
                include: {
                    seller: { include: { owner: true } },
                    buyer: true,
                    items: { include: { product: true }, take: 1 },
                },
            })
        }

        if (!order) {
            console.error('[checkout/callback] Order not found for reference:', reference)
            return NextResponse.redirect(`${baseUrl}/orders?payment=failed`)
        }

        // Idempotency check
        if (order.status === 'CONFIRMED') {
            return NextResponse.redirect(`${baseUrl}/orders?success=true&orderId=${order.id}`)
        }

        const platformFeeNgn = order.platformFeeNgn || 0

        await prisma.$transaction(async (tx) => {
            await tx.order.update({
                where: { id: order!.id },
                data: {
                    status: 'CONFIRMED',
                    escrowStatus: 'HELD',
                    paystackRef: reference,
                    platformFeeNgn,
                },
            })

            await tx.notification.create({
                data: {
                    userId: order!.seller.ownerId,
                    type: 'ORDER_CONFIRMED',
                    title: 'New order payment received',
                    body: `Order #${order!.id.slice(-6).toUpperCase()} has been paid (₦${Number(order!.totalAmount).toLocaleString()}). Prepare to ship.`,
                    link: '/orders',
                },
            })
        })

        if (order.buyer.email) {
            await notifyOrderUpdate({
                orderId: order.id,
                status: 'PAID',
                userId: order.buyer.id,
                userName: order.buyer.displayName,
                userEmail: order.buyer.email,
                productTitle: order.items[0]?.product.title || 'Product',
                link: '/orders',
            })
        }

        const sellerOwner = order.seller.owner
        if (sellerOwner?.email) {
            void notifyOrderUpdate({
                orderId: order.id,
                status: 'NEW_ORDER',
                userId: sellerOwner.id,
                userName: sellerOwner.displayName,
                userEmail: sellerOwner.email,
                productTitle: order.items[0]?.product.title || 'Product',
                amount: Number(order.totalAmount),
                link: '/orders',
            })
        }

        void sendOrderAutoDM(order.buyer.id, order.seller.ownerId, order.id)

        return NextResponse.redirect(`${baseUrl}/orders?success=true&orderId=${order.id}`)
    } catch (err) {
        console.error('[checkout/callback] Error:', err)
        return NextResponse.redirect(`${baseUrl}/orders?payment=failed`)
    }
}
