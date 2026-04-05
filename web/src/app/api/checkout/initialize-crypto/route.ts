import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uuidToBytes32 } from "@/lib/thirdweb";

// Fee model (off-chain computation, enforced by contract via explicit sellerPayout param):
//   Buyer pays:    ngnTotal × 1.05 / bufferedRate  (5% gateway + 1.5% buffer baked into rate)
//   Seller gets:   ngnTotal × 0.95 / bufferedRate  (5% seller fee deducted)
//   DepMi keeps:   deposit - sellerPayout           (~10% combined + slippage buffer)
//
// Buffer is captured for DepMi because sellerPayout uses the SAME buffered rate as the deposit,
// meaning the buffer amount stays in (deposit - sellerPayout) instead of flowing to the seller.
const BUYER_GATEWAY_FEE_PERCENT = 0.03;   // 5% added on top for buyer
const SELLER_FEE_PERCENT = 0.05;          // 5% deducted from seller's share
const SLIPPAGE_BUFFER = 0.015;            // 1.5% baked into rate by /api/rates/usdc-ngn

/**
 * POST /api/checkout/initialize-crypto
 * Creates a PENDING crypto Order and returns the USDC amount + escrow params
 * needed for the client to call createOrder() on the smart contract.
 *
 * The client (buyer) then:
 *   1. Approves USDC spend on the USDC contract
 *   2. Calls escrow.createOrder(bytes32OrderId, sellerAddress, usdcAmount)
 *   3. POSTs to /api/checkout/crypto-confirm with txHash
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    productId,
    quantity = 1,
    deliveryAddress,
    deliveryNote,
    demandId,
    bidId,
    deliveryMethod = "DELIVERY",
    shipbubbleReqToken,
    shipbubbleDeliveryFee,
  } = body;

  if (!productId || !deliveryAddress) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const [buyer, product] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, displayName: true },
      }),
      prisma.product.findUnique({
        where: { id: productId },
        include: {
          store: {
            select: {
              id: true,
              name: true,
              ownerId: true,
              cryptoPaymentsEnabled: true,
              cryptoWalletAddr: true,
            },
          },
        },
      }),
    ]);

    if (!buyer) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    if (!product.inStock) return NextResponse.json({ error: "Product out of stock" }, { status: 400 });
    if (quantity > (product.stock ?? 1)) {
      return NextResponse.json({ error: "Quantity exceeds stock" }, { status: 400 });
    }
    if (product.store.ownerId === session.user.id) {
      return NextResponse.json({ error: "You can't buy from your own store" }, { status: 400 });
    }
    if (!product.store.cryptoPaymentsEnabled || !product.store.cryptoWalletAddr) {
      return NextResponse.json(
        { error: "This store does not accept crypto payments" },
        { status: 400 }
      );
    }

    // ── Fetch live USDC/NGN rate ─────────────────────────────────────────────
    let ngnPerUsdc = 1650; // fallback
    try {
      const rateRes = await fetch(
        `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/rates/usdc-ngn`,
        { signal: AbortSignal.timeout(3000) }
      );
      if (rateRes.ok) {
        const rateData = await rateRes.json();
        ngnPerUsdc = rateData.ngnPerUsdc;
      }
    } catch {
      // use fallback
    }

    // ── Calculate amounts ────────────────────────────────────────────────────
    const itemPrice = Number(product.price);
    const subtotal = itemPrice * quantity;
    const deliveryFee =
      deliveryMethod === "PICKUP"
        ? 0
        : shipbubbleDeliveryFee
        ? Number(shipbubbleDeliveryFee)
        : Number(product.deliveryFee || 2500);
    const ngnTotal = subtotal + deliveryFee;

    // Buyer deposit: ngnTotal × 1.05 / bufferedRate (includes gateway fee; buffer baked into rate)
    // Seller payout: ngnTotal × 0.95 / bufferedRate (seller fee deducted; same buffered rate)
    // DepMi captures: deposit - sellerPayout (= ~10% fees + full 1.5% slippage buffer)
    const usdcDeposit = (ngnTotal * (1 + BUYER_GATEWAY_FEE_PERCENT)) / ngnPerUsdc;
    const usdcSellerPayout = (ngnTotal * (1 - SELLER_FEE_PERCENT)) / ngnPerUsdc;

    // Round up deposit (buyer pays a little more), round down seller payout (seller gets a little less)
    const usdcAmountRounded = Math.ceil(usdcDeposit * 1_000_000) / 1_000_000;
    const usdcSellerPayoutRounded = Math.floor(usdcSellerPayout * 1_000_000) / 1_000_000;
    const depmiCutUsdc = usdcAmountRounded - usdcSellerPayoutRounded;

    // ── Create Order ─────────────────────────────────────────────────────────
    const order = await prisma.order.create({
      data: {
        buyerId: session.user.id,
        sellerId: product.store.id,
        totalAmount: ngnTotal, // store NGN amount for records
        cryptoAmountUsdc: usdcAmountRounded,
        paymentRail: "CRYPTO",
        status: "PENDING",
        escrowStatus: "HELD",
        deliveryAddress,
        deliveryMethod,
        deliveryNote: deliveryNote ?? null,
        demandId: demandId ?? null,
        bidId: bidId ?? null,
        shipbubbleReqToken: shipbubbleReqToken ?? null,
        dispatchProvider: shipbubbleReqToken ? "shipbubble/gigl" : null,
        items: {
          create: {
            productId: product.id,
            quantity,
            price: itemPrice,
          },
        },
      },
    });

    // Save buyer details if requested
    if (body.saveDetails) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          phoneNumber: body.phone ?? undefined,
          address: body.addressLine ?? undefined,
          city: body.city ?? undefined,
          state: body.stateVal ?? undefined,
        },
      });
    }

    const contractOrderId = uuidToBytes32(order.id);
    const escrowAddress = process.env.ESCROW_CONTRACT_ADDRESS;
    const usdcAddress =
      process.env.NODE_ENV === "production"
        ? "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" // Base mainnet USDC
        : "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; // Base Sepolia USDC

    return NextResponse.json({
      orderId: order.id,
      // On-chain params the client needs to call createOrder(orderId, seller, amount, sellerPayout)
      contractOrderId,
      sellerWalletAddress: product.store.cryptoWalletAddr,
      usdcAmount: usdcAmountRounded,
      usdcAmountUnits: Math.ceil(usdcAmountRounded * 1_000_000),             // amount (6-decimal int)
      usdcSellerPayoutUnits: Math.floor(usdcSellerPayoutRounded * 1_000_000), // sellerPayout (6-decimal int)
      escrowContractAddress: escrowAddress,
      usdcContractAddress: usdcAddress,
      // Display breakdown
      breakdown: {
        subtotalNgn: subtotal,
        deliveryFeeNgn: deliveryFee,
        baseNgn: ngnTotal,
        gatewayFeeNgn: Math.round(ngnTotal * BUYER_GATEWAY_FEE_PERCENT),
        totalNgnWithFee: Math.round(ngnTotal * (1 + BUYER_GATEWAY_FEE_PERCENT)),
        ngnPerUsdc,
        usdcDeposited: usdcAmountRounded,
        sellerReceivesUsdc: usdcSellerPayoutRounded,
        depmiCutUsdc: Math.round(depmiCutUsdc * 1_000_000) / 1_000_000,
        slippageBufferPercent: SLIPPAGE_BUFFER * 100,
      },
      rateLockExpiry: Date.now() + 5 * 60 * 1000, // 5 minutes
    });
  } catch (error: any) {
    console.error("[checkout/initialize-crypto] Error:", error);
    return NextResponse.json(
      { error: error.message || "Server error" },
      { status: 500 }
    );
  }
}
