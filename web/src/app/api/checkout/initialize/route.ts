import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { initializePayment } from '@/lib/flutterwave'

/**
 * POST /api/checkout/initialize
 * Creates an Order record and a Flutterwave payment link for the buyer.
 * Returns the payment link to redirect the buyer to.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { productId, quantity = 1, deliveryAddress, deliveryNote, demandId, bidId, deliveryMethod = 'DELIVERY' } = body

  if (!productId || !deliveryAddress) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  try {
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
    if (quantity > (product.stock ?? 1)) return NextResponse.json({ error: 'Selected quantity exceeds available stock' }, { status: 400 })

    if (product.store.ownerId === session.user.id) {
      return NextResponse.json({ error: "You can't buy from your own store" }, { status: 400 })
    }

    const itemPrice = Number(product.price)
    const totalItemsAmount = itemPrice * quantity
    const deliveryFee = deliveryMethod === 'PICKUP' ? 0 : Number(product.deliveryFee || 2500)
    const subtotalAndDelivery = totalItemsAmount + deliveryFee
    const finalAmountToPay = subtotalAndDelivery

    // Create Order + OrderItem atomically
    const order = await prisma.$transaction(async (tx) => {
      if (body.saveDetails) {
        await tx.user.update({
          where: { id: session.user.id },
          data: {
            phoneNumber: body.phone,
            address: body.addressLine,
            city: body.city,
            state: body.stateVal,
          }
        })
      }

      return tx.order.create({
        data: {
          buyerId: session.user.id,
          sellerId: product.store.id,
          totalAmount: subtotalAndDelivery,
          status: 'PENDING',
          escrowStatus: 'HELD',
          paymentRail: 'NAIRA',
          deliveryAddress,
          deliveryMethod,
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
    })

    // Generate Flutterwave payment link
    let payment
    try {
      payment = await initializePayment({
        orderId: order.id,
        amount: finalAmountToPay,
        buyerName: buyer.displayName,
        buyerEmail: buyer.email ?? `${session.user.id}@depmi.app`,
      })
    } catch (err: any) {
      try {
        await prisma.order.delete({ where: { id: order.id } })
      } catch (cleanupErr) {
        console.error('[checkout/initialize] Failed to cleanup order:', cleanupErr)
      }
      console.error('[checkout/initialize] Flutterwave error:', err)
      return NextResponse.json(
        { error: `Payment provider error: ${err.message || 'Unavailable'}. Please try again.` },
        { status: 502 },
      )
    }

    // Save tx_ref on the order
    await prisma.order.update({
      where: { id: order.id },
      data: { paystackRef: payment.txRef },
    })

    return NextResponse.json({
      orderId: order.id,
      paymentLink: payment.paymentLink,
      amount: finalAmountToPay,
      breakdown: {
        subtotal: totalItemsAmount,
        deliveryFee,
        total: finalAmountToPay,
      },
    })
  } catch (error: any) {
    console.error('[checkout/initialize] Unhandled server error:', error)
    return NextResponse.json(
      { error: `Server Error: ${error.message || 'Unknown database or server failure'}` },
      { status: 500 }
    )
  }
}
