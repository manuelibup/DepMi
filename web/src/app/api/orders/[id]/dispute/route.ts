import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/orders/[id]/dispute
 * Buyer opens a dispute — freezes escrow until admin resolves.
 *
 * Body: { reason: string }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: orderId } = await params
  const { reason } = await req.json()

  if (!reason?.trim()) {
    return NextResponse.json({ error: 'Dispute reason required' }, { status: 400 })
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      seller: { select: { ownerId: true, name: true } },
    },
  })

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  if (order.buyerId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (['COMPLETED', 'CANCELLED', 'REFUNDED', 'DISPUTED'].includes(order.status)) {
    return NextResponse.json(
      { error: `Cannot dispute order in status: ${order.status}` },
      { status: 400 },
    )
  }

  await prisma.$transaction(async (tx) => {
    // Freeze escrow — HELD stays HELD, status → DISPUTED
    await tx.order.update({
      where: { id: orderId },
      data: { status: 'DISPUTED' },
    })

    // Notify seller
    await tx.notification.create({
      data: {
        userId: order.seller.ownerId,
        type: 'DISPUTE_OPENED',
        title: 'Dispute opened on your order',
        body: `A buyer has raised a dispute on Order #${orderId.slice(-6).toUpperCase()}. Reason: "${reason.slice(0, 120)}". Our team will review within 24 hours.`,
        link: '/orders',
      },
    })
  })

  // TODO Phase 4: create DisputeCase record + notify admin via email/Slack
  console.info(`[dispute] Order ${orderId} disputed by ${session.user.id}. Reason: ${reason}`)

  return NextResponse.json({ ok: true })
}
