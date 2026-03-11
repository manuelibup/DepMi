import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { initiatePayout } from '@/lib/flutterwave'
import { OtpType } from '@prisma/client'

/**
 * POST /api/orders/[id]/confirm
 * Buyer confirms delivery — releases escrow to seller.
 *
 * Flow:
 * 1. Validate buyer owns this order and it's in SHIPPED state
 * 2. Calculate seller payout (total - 5% platform fee)
 * 3. Mark order COMPLETING (RELEASING escrow)
 * 4. Initiate Monnify payout to seller's bank
 * 5. Mark order COMPLETED, escrow RELEASED
 * 6. Award Deps to buyer and seller
 * 7. Notify seller of payment
 */
import { verifyOtp } from '@/lib/otp'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: orderId } = await params
  const body = await req.json().catch(() => ({}));
  const { code } = body;

  if (!code) {
    return NextResponse.json({ error: 'Verification code is required' }, { status: 400 });
  }

  const isOtpValid = await verifyOtp(session.user.id, OtpType.TRANSACTIONAL, code);
  if (!isOtpValid) {
    return NextResponse.json({ error: 'Invalid or expired verification code' }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      seller: {
        include: { owner: true }
      },
      buyer: { select: { id: true, displayName: true, email: true } },
      items: { include: { product: { select: { title: true } } }, take: 1 }
    },
  })

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  if (order.buyerId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Allow confirmation from SHIPPED or DELIVERED (in case auto-delivered state)
  if (!['SHIPPED', 'DELIVERED', 'CONFIRMED'].includes(order.status)) {
    return NextResponse.json(
      { error: `Cannot confirm order in status: ${order.status}` },
      { status: 400 },
    )
  }

  if (order.escrowStatus === 'RELEASED') {
    return NextResponse.json({ error: 'Escrow already released' }, { status: 400 })
  }

  const totalAmount = Number(order.totalAmount)
  const platformFee = Math.round(totalAmount * 0.05 * 100) / 100
  const sellerAmount = Math.round((totalAmount - platformFee) * 100) / 100

  // Check seller has bank details
  if (!order.seller.bankCode || !order.seller.bankAccountNo) {
    // Mark completed in DB but flag payout as pending manual review
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'COMPLETED',
        escrowStatus: 'RELEASING', // Stays RELEASING until seller adds bank details
        platformFeeNgn: platformFee,
      },
    })
    await prisma.notification.create({
      data: {
        userId: order.seller.ownerId,
        type: 'PAYMENT_RELEASED',
        title: 'Add your bank details to receive payment',
        body: `Order #${orderId.slice(-6).toUpperCase()} confirmed. Add your bank account in Settings to receive ₦${sellerAmount.toLocaleString()}.`,
        link: '/settings/payouts',
      },
    })
    return NextResponse.json({ ok: true, pending: true, message: 'Seller needs to add bank details' })
  }

  // Mark escrow as releasing
  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: 'DELIVERED',
      escrowStatus: 'RELEASING',
      platformFeeNgn: platformFee,
    },
  })

  // Initiate payout
  let payoutResult
  try {
    payoutResult = await initiatePayout({
      amount: sellerAmount,
      bankCode: order.seller.bankCode,
      accountNumber: order.seller.bankAccountNo,
      accountName: order.seller.bankAccountName ?? order.seller.name,
      narration: `DepMi payout - Order #${orderId.slice(-6).toUpperCase()}`,
      reference: `payout-${orderId}`,
    })
  } catch (err) {
    // Revert to DELIVERED so seller can retry / admin can intervene
    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'DELIVERED', escrowStatus: 'RELEASING' },
    })
    console.error('[orders/confirm] Payout failed:', err)
    const errorMsg = (err instanceof Error) ? err.message : 'Payout failed'
    return NextResponse.json({ error: `${errorMsg} — support has been notified` }, { status: 502 })
  }

  // Finalize: COMPLETED + RELEASED + award Deps
  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: { status: 'COMPLETED', escrowStatus: 'RELEASED' },
    })

    // Award 1 Dep to buyer
    await tx.user.update({
      where: { id: order.buyerId },
      data: { depCount: { increment: 1 } },
    })
    await tx.depTransaction.create({
      data: {
        userId: order.buyerId,
        amount: 1,
        reason: `Completed purchase — Order #${orderId.slice(-6).toUpperCase()}`,
        orderId,
      },
    })

    // Award 1 Dep to seller store
    await tx.store.update({
      where: { id: order.sellerId },
      data: { depCount: { increment: 1 } },
    })
    await tx.depTransaction.create({
      data: {
        storeId: order.sellerId,
        amount: 1,
        reason: `Completed sale — Order #${orderId.slice(-6).toUpperCase()}`,
        orderId,
      },
    })

    // Notify seller
    await tx.notification.create({
      data: {
        userId: order.seller.ownerId,
        type: 'PAYMENT_RELEASED',
        title: 'Payment sent to your bank',
        body: `₦${sellerAmount.toLocaleString()} for Order #${orderId.slice(-6).toUpperCase()} is on its way to your account.`,
        link: '/orders',
      },
    })

    // Send Email to Seller
    if (order.seller.owner.email) {
      const { notifyOrderUpdate } = await import('@/lib/notify-watchers');
      await notifyOrderUpdate({
        orderId,
        status: 'COMPLETED',
        userId: order.seller.ownerId,
        userName: order.seller.owner.displayName,
        userEmail: order.seller.owner.email,
        productTitle: order.items[0]?.product.title || 'Product',
        amount: sellerAmount,
        link: '/orders'
      });
    }
  })

  return NextResponse.json({ ok: true, payoutReference: payoutResult.reference })
}
