import type { Metadata } from "next";
import CryptoCheckoutClient from "./CryptoCheckoutClient";

export const metadata: Metadata = {
  title: "Crypto Payment — DepMi",
};

interface Props {
  params: { orderId: string };
  searchParams: {
    contractOrderId?: string;
    usdcAmount?: string;
    usdcSellerPayout?: string;
    seller?: string;
    usdc?: string;
    escrow?: string;
  };
}

export default function CryptoCheckoutPage({ params, searchParams }: Props) {
  const { orderId } = params;
  const { contractOrderId, usdcAmount, usdcSellerPayout, seller, usdc, escrow } = searchParams;

  if (!contractOrderId || !usdcAmount || !usdcSellerPayout || !seller || !usdc || !escrow) {
    return (
      <div style={{ padding: "48px 24px", textAlign: "center" }}>
        <h2>Invalid payment link</h2>
        <p>Missing required parameters. Please go back and try again.</p>
      </div>
    );
  }

  return (
    <CryptoCheckoutClient
      orderId={orderId}
      contractOrderId={contractOrderId as `0x${string}`}
      usdcAmountUnits={BigInt(usdcAmount)}
      usdcSellerPayoutUnits={BigInt(usdcSellerPayout)}
      sellerAddress={seller}
      usdcContractAddress={usdc}
      escrowContractAddress={escrow}
    />
  );
}
