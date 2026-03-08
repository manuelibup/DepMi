import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateWebhookSignature } from '@/lib/monnify'
import { notifyOrderUpdate } from '@/lib/notify-watchers'

/**
 * Monnify payment webhook.
 *
 * Security:
 * - Validates HMAC-SHA512 signature before touching the DB
 * - Idempotent: re-delivery of same transactionReference is a no-op
 * - Never exposes error details in response (return 200 to prevent Monnify retries on our bugs)
 */
export async function POST(req: NextRequest) {
  let rawBody: string
  try {
    rawBody = await req.text()
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  // Validate Monnify HMAC signature
  const signature = req.headers.get('monnify-signature') ?? ''
  if (!signature) {
    console.error('[monnify-webhook] Missing signature header')
    return NextResponse.json({ ok: false }, { status: 401 })
  }
  if (!validateWebhookSignature(rawBody, signature)) {
    console.error('[monnify-webhook] Invalid signature')
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  let payload: MonnifyWebhookPayload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  // Only handle successful RESERVED_ACCOUNT payments
  if (
    payload.eventType !== 'SUCCESSFUL_TRANSACTION' ||
    payload.eventData?.paymentStatus !== 'PAID'
  ) {
    return NextResponse.json({ ok: true }) // Acknowledge but ignore
  }

  const { transactionReference, amountPaid, accountReference } =
    payload.eventData

  // accountReference format: "depmi-order-{orderId}"
  const orderId = accountReference?.replace('depmi-order-', '')
  if (!orderId) {
    console.error('[monnify-webhook] Could not parse orderId from', accountReference)
    return NextResponse.json({ ok: true })
  }

  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { 
          seller: { include: { owner: true } },
          buyer: true,
          items: { include: { product: true }, take: 1 }
        },
      })

      if (!order) {
        console.error('[monnify-webhook] Order not found:', orderId)
        return
      }

      // Idempotency: if already confirmed, skip
      if (order.paystackRef === transactionReference) return
      if (order.escrowStatus !== 'HELD' || order.status !== 'PENDING') return

      // Calculate platform fee (5% of order total, max precision)
      const platformFeeNgn = Math.round(Number(order.totalAmount) * 0.05 * 100) / 100

      // Mark order as paid — escrow is now HELD (funds in Monnify, not yet paid to seller)
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'CONFIRMED',
          escrowStatus: 'HELD',
          paystackRef: transactionReference, // Reusing field for Monnify tx ref
          platformFeeNgn,
        },
      })

      // Notify seller
      await tx.notification.create({
        data: {
          userId: order.seller.ownerId,
          type: 'ORDER_CONFIRMED',
          title: 'New order payment received',
          body: `Order #${orderId.slice(-6).toUpperCase()} has been paid (₦${Number(order.totalAmount).toLocaleString()}). Prepare to ship.`,
          link: `/orders`,
        },
      })

      // Send email to buyer
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
    // Log internally but return 200 so Monnify doesn't keep retrying
    console.error('[monnify-webhook] DB error:', err)
  }

  return NextResponse.json({ ok: true })
}

interface MonnifyWebhookPayload {
  eventType: string
  eventData?: {
    transactionReference: string
    paymentReference: string
    amountPaid: number
    totalPayable: number
    paymentStatus: string
    accountReference: string
    product?: {
      reference: string
      type: string
    }
  }
}
