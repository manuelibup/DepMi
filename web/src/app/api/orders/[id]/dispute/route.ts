import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { resend } from '@/lib/resend'

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

  // Notify all admins by email
  const adminEmails = (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || '')
    .split(',').map(e => e.trim()).filter(Boolean)

  if (adminEmails.length > 0) {
    const shortId = orderId.slice(-6).toUpperCase()
    resend.emails.send({
      from: 'DepMi Disputes <noreply@depmi.com>',
      to: adminEmails,
      subject: `⚠️ Dispute Opened — Order #${shortId}`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:auto;padding:24px;border:1px solid #eee;border-radius:12px">
          <h2 style="color:#e74c3c;margin-top:0">Dispute Raised</h2>
          <p><strong>Order:</strong> #${shortId} (<code>${orderId}</code>)</p>
          <p><strong>Buyer ID:</strong> ${session.user.id}</p>
          <p><strong>Seller:</strong> ${order.seller.name}</p>
          <div style="background:#fff5f5;border-left:4px solid #e74c3c;padding:12px;border-radius:4px;margin:16px 0">
            <p style="margin:0;font-weight:600">Reason:</p>
            <p style="margin:8px 0 0">${reason.slice(0, 500)}</p>
          </div>
          <p style="color:#666;font-size:0.9rem">Escrow is frozen. Resolve via the admin panel or contact both parties directly.</p>
        </div>
      `,
    }).catch((err: unknown) => console.error('[dispute] Admin email failed:', err))
  }

  return NextResponse.json({ ok: true })
}
