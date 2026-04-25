// DEPRECATED — Monnify integration was never fully activated.
// Payment rail is Paystack. New webhook: https://depmi.com/api/webhooks/paystack

import { NextResponse } from 'next/server'

export async function POST() {
    return NextResponse.json({ ok: false, message: 'Monnify integration removed' }, { status: 410 })
}

/*
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateWebhookSignature } from '@/lib/monnify'
import { notifyOrderUpdate } from '@/lib/notifyWatchers'

export async function POST(req: NextRequest) {
  let rawBody: string
  try { rawBody = await req.text() } catch { return NextResponse.json({ ok: false }, { status: 400 }) }

  const signature = req.headers.get('monnify-signature') ?? ''
  if (!signature) { console.error('[monnify-webhook] Missing signature header'); return NextResponse.json({ ok: false }, { status: 401 }) }
  if (!validateWebhookSignature(rawBody, signature)) { console.error('[monnify-webhook] Invalid signature'); return NextResponse.json({ ok: false }, { status: 401 }) }

  let payload: MonnifyWebhookPayload
  try { payload = JSON.parse(rawBody) } catch { return NextResponse.json({ ok: false }, { status: 400 }) }

  if (payload.eventType !== 'SUCCESSFUL_TRANSACTION' || payload.eventData?.paymentStatus !== 'PAID') {
    return NextResponse.json({ ok: true })
  }

  const { transactionReference, amountPaid, accountReference } = payload.eventData
  const orderId = accountReference?.replace('depmi-order-', '')
  if (!orderId) { console.error('[monnify-webhook] Could not parse orderId from', accountReference); return NextResponse.json({ ok: true }) }

  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId }, include: { seller: { include: { owner: true } }, buyer: true, items: { include: { product: true }, take: 1 } } })
      if (!order) { console.error('[monnify-webhook] Order not found:', orderId); return }
      if (order.paystackRef === transactionReference) return
      if (order.escrowStatus !== 'HELD' || order.status !== 'PENDING') return

      const platformFeeNgn = order.platformFeeNgn || 0
      await tx.order.update({ where: { id: orderId }, data: { status: 'CONFIRMED', escrowStatus: 'HELD', paystackRef: transactionReference, platformFeeNgn } })

      for (const item of order.items) {
        if (!item.product) continue
        const newStock = Math.max(0, (item.product.stock || 1) - item.quantity)
        await tx.product.update({ where: { id: item.productId }, data: { stock: newStock, inStock: newStock > 0 } })
      }

      await tx.notification.create({ data: { userId: order.seller.ownerId, type: 'ORDER_CONFIRMED', title: 'New order payment received', body: `Order #${orderId.slice(-6).toUpperCase()} has been paid (₦${Number(order.totalAmount).toLocaleString()}). Prepare to ship.`, link: '/orders' } })

      if (order.buyer.email) { await notifyOrderUpdate({ orderId, status: 'PAID', userId: order.buyer.id, userName: order.buyer.displayName, userEmail: order.buyer.email, productTitle: order.items[0]?.product.title || 'Product', link: '/orders' }) }

      await tx.storeFollow.upsert({ where: { userId_storeId: { userId: order.buyer.id, storeId: order.seller.id } }, create: { userId: order.buyer.id, storeId: order.seller.id }, update: {} })
      await tx.userFollow.upsert({ where: { followerId_followingId: { followerId: order.buyer.id, followingId: order.seller.ownerId } }, create: { followerId: order.buyer.id, followingId: order.seller.ownerId }, update: {} })
    })
  } catch (err) { console.error('[monnify-webhook] DB error:', err) }

  return NextResponse.json({ ok: true })
}

interface MonnifyWebhookPayload {
  eventType: string
  eventData?: { transactionReference: string; paymentReference: string; amountPaid: number; totalPayable: number; paymentStatus: string; accountReference: string; product?: { reference: string; type: string } }
}
*/
