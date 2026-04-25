import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/checkout/verify?orderId=xxx
 * Polled by the checkout UI every 5s to detect payment.
 * Paystack uses redirect+webhook — payment status is always reflected in DB.
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
    },
  })

  if (!order || order.buyerId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const paid = order.status === 'CONFIRMED'
  return NextResponse.json({ paid, status: order.status })
}
