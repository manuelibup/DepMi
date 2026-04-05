import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOnChainOrder, EscrowStatusOnChain } from "@/lib/thirdweb";

/**
 * POST /api/checkout/crypto-confirm
 * Called by the client after the buyer's createOrder() tx is confirmed on-chain.
 * Verifies the on-chain escrow state, then marks the DepMi Order as CONFIRMED.
 *
 * Body: { orderId: string, txHash: string }
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { orderId, txHash } = body;

  if (!orderId || !txHash) {
    return NextResponse.json({ error: "orderId and txHash required" }, { status: 400 });
  }

  try {
    // Fetch the DepMi order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { product: true } },
        seller: { select: { id: true, name: true, ownerId: true } },
      },
    });

    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (order.buyerId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (order.paymentRail !== "CRYPTO") {
      return NextResponse.json({ error: "Not a crypto order" }, { status: 400 });
    }

    // Idempotency: already confirmed
    if (order.status === "CONFIRMED") {
      return NextResponse.json({ success: true, already: true });
    }

    if (order.status !== "PENDING") {
      return NextResponse.json(
        { error: `Order is in ${order.status} state, cannot confirm` },
        { status: 400 }
      );
    }

    // Verify on-chain: the escrow contract must have the order in HELD status
    let onChainOrder;
    try {
      onChainOrder = await getOnChainOrder(orderId);
    } catch (err) {
      console.error("[crypto-confirm] On-chain read failed:", err);
      return NextResponse.json(
        { error: "Could not verify on-chain escrow. Please wait and retry." },
        { status: 502 }
      );
    }

    if (Number(onChainOrder.status) !== EscrowStatusOnChain.HELD) {
      return NextResponse.json(
        { error: "On-chain escrow not in HELD state. Payment may not have gone through." },
        { status: 400 }
      );
    }

    // All good — confirm the order
    await prisma.$transaction(async (tx) => {
      // Update order
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: "CONFIRMED",
          cryptoTxHash: txHash,
        },
      });

      // Decrement stock
      for (const item of order.items) {
        if (item.product.stock !== null) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: { decrement: item.quantity },
              inStock: item.product.stock - item.quantity > 0,
            },
          });
        }
      }

      // Notify seller
      await tx.notification.create({
        data: {
          userId: order.seller.ownerId,
          type: "ORDER_CONFIRMED",
          title: "New crypto order received!",
          body: `You have a new USDC order. Check your Orders page.`,
          link: `/orders`,
        },
      });
    });

    return NextResponse.json({ success: true, orderId });
  } catch (error: any) {
    console.error("[crypto-confirm] Error:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}
