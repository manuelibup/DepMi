import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendPushToUser } from '@/lib/webpush'

/**
 * POST /api/webhooks/shipbubble
 *
 * Receives delivery status updates from Shipbubble.
 * Configure this URL in: Shipbubble Dashboard → Settings → API Keys & Webhook → Live/Test webhook url
 *   Production:  https://depmi.com/api/webhooks/shipbubble
 *   Development: use ngrok or similar tunnel
 *
 * Events handled:
 *   - shipment.label.created  → order already CONFIRMED/SHIPPED, update tracking URL
 *   - shipment.picked_up      → notify buyer rider has picked up
 *   - shipment.in_transit     → notify buyer item is on the way
 *   - shipment.delivered      → notify buyer to confirm delivery
 */
export async function POST(req: NextRequest) {
    let payload: ShipbubbleWebhookPayload
    try {
        payload = await req.json()
    } catch {
        return NextResponse.json({ ok: false }, { status: 400 })
    }

    const { event, data } = payload
    if (!data?.order_id && !data?.tracking_code) {
        return NextResponse.json({ ok: true })
    }

    // Find order by dispatchOrderId
    const order = await prisma.order.findFirst({
        where: { dispatchOrderId: data.order_id },
        include: {
            buyer: { select: { id: true, displayName: true } },
            seller: { select: { name: true } },
        },
    })

    if (!order) {
        console.warn('[shipbubble-webhook] No order found for dispatchOrderId:', data.order_id)
        return NextResponse.json({ ok: true })
    }

    try {
        switch (event) {
            case 'shipment.label.created': {
                await prisma.order.update({
                    where: { id: order.id },
                    data: {
                        trackingNo: data.tracking_url ?? data.tracking_code ?? order.trackingNo,
                        status: 'SHIPPED',
                    },
                })
                break
            }

            case 'shipment.picked_up': {
                await prisma.notification.create({
                    data: {
                        userId: order.buyerId,
                        type: 'ORDER_SHIPPED',
                        title: 'Your order has been picked up!',
                        body: `A GIG Logistics rider has picked up your order from ${order.seller.name}. It's on its way!`,
                        link: '/orders',
                    },
                })
                sendPushToUser(order.buyerId, {
                    title: 'Order picked up',
                    body: `GIG Logistics rider collected your order from ${order.seller.name}`,
                    url: '/orders',
                    tag: `dispatch-pickup-${order.id}`,
                }).catch(() => {})
                break
            }

            case 'shipment.in_transit': {
                await prisma.notification.create({
                    data: {
                        userId: order.buyerId,
                        type: 'ORDER_SHIPPED',
                        title: 'Your order is on the way!',
                        body: `Your order from ${order.seller.name} is in transit${data.tracking_url ? `. Track: ${data.tracking_url}` : ''}.`,
                        link: '/orders',
                    },
                })
                break
            }

            case 'shipment.delivered': {
                await Promise.all([
                    prisma.order.update({
                        where: { id: order.id },
                        data: { status: 'SHIPPED' }, // buyer still needs to confirm
                    }),
                    prisma.notification.create({
                        data: {
                            userId: order.buyerId,
                            type: 'ORDER_SHIPPED',
                            title: 'Your order has been delivered!',
                            body: `Your order from ${order.seller.name} has arrived. Please confirm delivery on DepMi to release payment to the seller.`,
                            link: '/orders',
                        },
                    }),
                ])
                sendPushToUser(order.buyerId, {
                    title: 'Order delivered — confirm receipt',
                    body: `Your order from ${order.seller.name} has arrived. Tap to confirm delivery.`,
                    url: '/orders',
                    tag: `dispatch-delivered-${order.id}`,
                }).catch(() => {})
                break
            }
        }
    } catch (err) {
        console.error('[shipbubble-webhook] DB error:', err)
    }

    return NextResponse.json({ ok: true })
}

interface ShipbubbleWebhookPayload {
    event: string
    data?: {
        order_id?: string
        tracking_code?: string
        tracking_url?: string
        status?: string
        message?: string
    }
}
