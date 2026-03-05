import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkReservedAccountPayment } from '@/lib/monnify'

/**
 * GET /api/checkout/verify?orderId=xxx
 * Polled by the checkout UI every 5s to detect payment.
 * Returns { paid: boolean, status: string }
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const orderId = req.nextUrl.searchParams.get('orderId')
  if (!orderId) {
    return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      buyerId: true,
      status: true,
      escrowStatus: true,
      virtualAcctExpiry: true,
    },
  })

  if (!order || order.buyerId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Already confirmed — return immediately (webhook beat the poll)
  if (order.status === 'CONFIRMED') {
    return NextResponse.json({ paid: true, status: 'CONFIRMED' })
  }

  // Check expiry
  if (order.virtualAcctExpiry && new Date() > order.virtualAcctExpiry) {
    return NextResponse.json({ paid: false, status: 'EXPIRED' })
  }

  // Poll Monnify for this order's reserved account
  const accountReference = `depmi-order-${orderId}`
  const result = await checkReservedAccountPayment(accountReference)

  if (result?.paid) {
    // Payment detected via poll (webhook may have been delayed)
    // The webhook handler is authoritative — this is just a fallback signal
    return NextResponse.json({ paid: true, status: 'CONFIRMED' })
  }

  return NextResponse.json({ paid: false, status: order.status })
}
