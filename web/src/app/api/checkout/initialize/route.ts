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
  const { productId, quantity = 1, deliveryAddress, deliveryNote, demandId, bidId, deliveryMethod = 'DELIVERY', shipbubbleReqToken, shipbubbleDeliveryFee, isDigital = false, variantId } = body

  if (!productId || (!isDigital && !deliveryAddress)) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  try {
    const [buyer, product, variant] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, displayName: true, email: true, kycTier: true },
      }),
      prisma.product.findUnique({
        where: { id: productId },
        include: { store: { select: { id: true, name: true, ownerId: true } } },
      }),
      variantId
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? (prisma as any).productVariant.findUnique({ where: { id: variantId }, select: { id: true, name: true, price: true, stock: true } })
        : Promise.resolve(null),
    ])

    if (!buyer) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    if (!product.inStock) return NextResponse.json({ error: 'Product out of stock' }, { status: 400 })
    if (quantity > (product.stock ?? 1)) return NextResponse.json({ error: 'Selected quantity exceeds available stock' }, { status: 400 })

    if (product.store.ownerId === session.user.id) {
      return NextResponse.json({ error: "You can't buy from your own store" }, { status: 400 })
    }

    if (variantId && !variant) return NextResponse.json({ error: 'Variant not found' }, { status: 404 })
    if (variant && variant.stock === 0) return NextResponse.json({ error: 'This variant is out of stock' }, { status: 400 })

    const productIsDigital = isDigital || product.isDigital
    const itemPrice = variant ? Number(variant.price) : Number(product.price)
    const totalItemsAmount = itemPrice * quantity
    // Digital products have no delivery fee; pickup is also free
    const deliveryFee = productIsDigital || deliveryMethod === 'PICKUP'
      ? 0
      : (shipbubbleDeliveryFee ? Number(shipbubbleDeliveryFee) : Number(product.deliveryFee || 2500))
    const subtotalAndDelivery = totalItemsAmount + deliveryFee
    // Service & escrow fee (5%) — charged to buyer; DepMi's revenue, separate from Flutterwave's cost
    const gatewayFee = 0; // Math.round(subtotalAndDelivery * 0.03 * 100) / 100
    const finalAmountToPay = subtotalAndDelivery + gatewayFee

    // Create or find existing Order
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

      if (body.resumeOrderId) {
        const existing = await tx.order.findUnique({
          where: { id: body.resumeOrderId },
        })
        if (existing && existing.buyerId === session.user.id && existing.status === 'PENDING') {
          return tx.order.update({
            where: { id: body.resumeOrderId },
            data: {
              totalAmount: subtotalAndDelivery,
              deliveryAddress,
              deliveryMethod,
              deliveryNote: deliveryNote ?? null,
            }
          })
        }
      }

      return tx.order.create({
        data: {
          buyerId: session.user.id,
          sellerId: product.store.id,
          totalAmount: subtotalAndDelivery,
          status: 'PENDING',
          escrowStatus: 'HELD',
          paymentRail: 'NAIRA',
          isDigital: productIsDigital,
          deliveryAddress: productIsDigital ? 'DIGITAL' : (deliveryAddress ?? ''),
          deliveryMethod: productIsDigital ? 'DIGITAL' : deliveryMethod,
          deliveryNote: deliveryNote ?? null,
          demandId: demandId ?? null,
          bidId: bidId ?? null,
          shipbubbleReqToken: productIsDigital ? null : (shipbubbleReqToken ?? null),
          dispatchProvider: (productIsDigital || !shipbubbleReqToken) ? null : 'shipbubble/gigl',
          items: {
            create: {
              productId: product.id,
              quantity,
              price: itemPrice,
              variantId: variant?.id ?? null,
              variantName: variant?.name ?? null,
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
        await prisma.orderItem.deleteMany({ where: { orderId: order.id } })
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
        gatewayFee,
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
