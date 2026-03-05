import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createOrderVirtualAccount } from '@/lib/monnify'

/**
 * POST /api/checkout/initialize
 * Creates an Order record and a Monnify reserved virtual account for the buyer.
 * Returns the bank account details the buyer must transfer to.
 *
 * Body: {
 *   productId: string
 *   quantity: number
 *   deliveryAddress: string
 *   deliveryNote?: string
 *   demandId?: string   // if originating from a demand/bid
 *   bidId?: string
 * }
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { productId, quantity = 1, deliveryAddress, deliveryNote, demandId, bidId } = body

  if (!productId || !deliveryAddress) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Fetch buyer and product
  const [buyer, product] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, displayName: true, email: true, kycTier: true },
    }),
    prisma.product.findUnique({
      where: { id: productId },
      include: { store: { select: { id: true, name: true, ownerId: true } } },
    }),
  ])

  if (!buyer) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  if (!product.inStock) return NextResponse.json({ error: 'Product out of stock' }, { status: 400 })

  // KYC gate — must be TIER_1 to buy via escrow
  const tierOrder = ['UNVERIFIED', 'TIER_0', 'TIER_1', 'TIER_2', 'TIER_3', 'BUSINESS']
  if (tierOrder.indexOf(buyer.kycTier) < tierOrder.indexOf('TIER_1')) {
    return NextResponse.json(
      { error: 'NIN verification required to place orders. Please complete KYC in Settings.' },
      { status: 403 },
    )
  }

  // Can't buy from your own store
  if (product.store.ownerId === session.user.id) {
    return NextResponse.json({ error: "You can't buy from your own store" }, { status: 400 })
  }

  const itemPrice = Number(product.price)
  const totalAmount = itemPrice * quantity
  const deliveryFee = 2500 // TODO: dynamic delivery fee in Phase 4
  const grandTotal = totalAmount + deliveryFee

  // Create Order + OrderItem atomically
  const order = await prisma.$transaction(async (tx) => {
    const newOrder = await tx.order.create({
      data: {
        buyerId: session.user.id,
        sellerId: product.store.id,
        totalAmount: grandTotal,
        status: 'PENDING',
        escrowStatus: 'HELD',
        paymentRail: 'NAIRA',
        deliveryAddress,
        deliveryNote: deliveryNote ?? null,
        demandId: demandId ?? null,
        bidId: bidId ?? null,
        items: {
          create: {
            productId: product.id,
            quantity,
            price: itemPrice,
          },
        },
      },
    })
    return newOrder
  })

  // Generate Monnify reserved virtual account for this order
  let virtualAccount
  try {
    virtualAccount = await createOrderVirtualAccount({
      orderId: order.id,
      amount: grandTotal,
      buyerName: buyer.displayName,
      buyerEmail: buyer.email ?? `${session.user.id}@depmi.app`,
      expiryMinutes: 30,
    })
  } catch (err) {
    // Clean up the order if Monnify fails
    await prisma.order.delete({ where: { id: order.id } })
    console.error('[checkout/initialize] Monnify error:', err)
    return NextResponse.json(
      { error: 'Payment provider unavailable. Please try again.' },
      { status: 502 },
    )
  }

  // Save virtual account details on the order
  await prisma.order.update({
    where: { id: order.id },
    data: {
      virtualAcctNo: virtualAccount.accountNumber,
      virtualAcctBank: virtualAccount.bankName,
      virtualAcctExpiry: virtualAccount.expiresAt,
    },
  })

  return NextResponse.json({
    orderId: order.id,
    amount: grandTotal,
    breakdown: {
      subtotal: totalAmount,
      deliveryFee,
      processingFee: Math.min(Math.round(grandTotal * 0.01), 1000),
      total: grandTotal,
    },
    virtualAccount: {
      accountNumber: virtualAccount.accountNumber,
      bankName: virtualAccount.bankName,
      accountName: virtualAccount.accountName,
      expiresAt: virtualAccount.expiresAt.toISOString(),
    },
  })
}
