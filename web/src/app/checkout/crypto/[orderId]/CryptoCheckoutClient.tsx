"use client";

/**
 * CryptoCheckoutClient — on-chain payment flow for DepMi crypto orders.
 *
 * Flow:
 *   1. User connects wallet (ThirdWeb ConnectButton — embedded or external)
 *   2. User approves USDC spend on the USDC ERC-20 contract
 *   3. User calls createOrder() on DepMiEscrow contract
 *   4. We poll for tx confirmation, then POST /api/checkout/crypto-confirm
 *   5. Redirect to /orders?success=true
 *
 * Gas is sponsored via ThirdWeb's paymaster (account abstraction).
 * Users with embedded wallets never see a gas prompt.
 */

import { useState, useEffect } from "react";
import {
  ConnectButton,
  useActiveAccount,
  useSendTransaction,
  useReadContract,
} from "thirdweb/react";
import { prepareContractCall, getContract, readContract } from "thirdweb";
import { base, baseSepolia } from "thirdweb/chains";
import { createThirdwebClient } from "thirdweb";

const IS_PROD = process.env.NODE_ENV === "production";
const chain = IS_PROD ? base : baseSepolia;

const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID!,
});

// Minimal ABIs
const ERC20_APPROVE_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
] as const;

const ESCROW_CREATE_ABI = [
  {
    name: "createOrder",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "orderId", type: "bytes32" },
      { name: "seller", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "sellerPayout", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

type Step = "connect" | "approve" | "paying" | "confirming" | "done" | "error";

interface Props {
  orderId: string;
  contractOrderId: `0x${string}`;
  usdcAmountUnits: bigint;
  usdcSellerPayoutUnits: bigint;
  sellerAddress: string;
  usdcContractAddress: string;
  escrowContractAddress: string;
}

export default function CryptoCheckoutClient({
  orderId,
  contractOrderId,
  usdcAmountUnits,
  usdcSellerPayoutUnits,
  sellerAddress,
  usdcContractAddress,
  escrowContractAddress,
}: Props) {
  const account = useActiveAccount();
  const { mutateAsync: sendTx } = useSendTransaction();

  const [step, setStep] = useState<Step>("connect");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const usdcContract = getContract({
    client,
    chain,
    address: usdcContractAddress,
    abi: ERC20_APPROVE_ABI,
  });

  const escrowContract = getContract({
    client,
    chain,
    address: escrowContractAddress,
    abi: ESCROW_CREATE_ABI,
  });

  // When wallet connects, move past the connect step
  useEffect(() => {
    if (account && step === "connect") {
      setStep("approve");
    }
  }, [account, step]);

  async function handleApproveAndPay() {
    if (!account) return;
    setErrorMsg(null);

    try {
      // Step 1: Approve USDC spend
      setStep("approve");
      const approveTx = prepareContractCall({
        contract: usdcContract,
        method: "approve",
        params: [escrowContractAddress, usdcAmountUnits],
      });
      await sendTx(approveTx);

      // Step 2: Create escrow order
      setStep("paying");
      const createTx = prepareContractCall({
        contract: escrowContract,
        method: "createOrder",
        params: [contractOrderId, sellerAddress as `0x${string}`, usdcAmountUnits, usdcSellerPayoutUnits],
      });
      const result = await sendTx(createTx);
      const hash = result.transactionHash;
      setTxHash(hash);

      // Step 3: Confirm with DepMi backend
      setStep("confirming");
      const confirmRes = await fetch("/api/checkout/crypto-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, txHash: hash }),
      });
      const confirmData = await confirmRes.json();

      if (!confirmRes.ok) {
        throw new Error(confirmData.error || "Confirmation failed");
      }

      setStep("done");
      setTimeout(() => {
        window.location.href = `/orders?success=true&orderId=${orderId}`;
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err?.message || "Something went wrong. Please try again.");
      setStep(account ? "approve" : "connect");
    }
  }

  const USDC_DISPLAY = (Number(usdcAmountUnits) / 1_000_000).toFixed(2);

  const stepLabels: Record<Step, string> = {
    connect: "Connect your wallet to continue",
    approve: `Approve ${USDC_DISPLAY} USDC spend`,
    paying: "Sending payment to escrow…",
    confirming: "Confirming with DepMi…",
    done: "Payment confirmed!",
    error: "Something went wrong",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "var(--bg)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "var(--card-bg)",
          border: "1.5px solid var(--card-border)",
          borderRadius: 20,
          padding: "32px 28px",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "rgba(99,102,241,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 12px",
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "var(--text-main)" }}>
            Crypto Payment
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "var(--text-muted)" }}>
            {USDC_DISPLAY} USDC on Base
          </p>
        </div>

        {/* Step progress */}
        <div
          style={{
            background: "rgba(99,102,241,0.06)",
            border: "1px solid rgba(99,102,241,0.2)",
            borderRadius: 12,
            padding: "14px 16px",
            fontSize: "0.88rem",
            color: step === "done" ? "var(--primary)" : "#6366f1",
            fontWeight: 600,
            textAlign: "center",
          }}
        >
          {stepLabels[step]}
        </div>

        {/* Connect button or action button */}
        {step === "connect" && !account && (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <ConnectButton
              client={client}
              chain={chain}
              connectModal={{
                title: "Connect to pay with USDC",
                welcomeScreen: {
                  title: "Pay with Crypto",
                  subtitle: "Connect your wallet or create one instantly with your email",
                },
              }}
            />
          </div>
        )}

        {account && step !== "done" && step !== "paying" && step !== "confirming" && (
          <button
            onClick={handleApproveAndPay}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: 12,
              background: "#6366f1",
              color: "#fff",
              border: "none",
              fontWeight: 700,
              fontSize: "0.95rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/>
            </svg>
            {step === "approve" ? `Approve & Pay ${USDC_DISPLAY} USDC` : "Continue"}
          </button>
        )}

        {(step === "paying" || step === "confirming") && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: "var(--text-muted)", fontSize: "0.88rem" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin 1s linear infinite" }}>
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
            {step === "paying" ? "Sending to escrow contract…" : "Confirming order…"}
          </div>
        )}

        {step === "done" && (
          <div style={{ textAlign: "center", color: "var(--primary)", fontSize: "0.9rem", fontWeight: 600 }}>
            ✓ Payment confirmed. Redirecting to your orders…
          </div>
        )}

        {errorMsg && (
          <p style={{ color: "#ef4444", fontSize: "0.85rem", margin: 0, textAlign: "center" }}>
            {errorMsg}
          </p>
        )}

        {/* Trust note */}
        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", textAlign: "center", margin: 0 }}>
          Funds are held in a non-custodial smart contract until you confirm delivery.{" "}
          <a href="/help/crypto-payments" style={{ color: "#6366f1" }}>Learn more</a>
        </p>

        {/* TX hash */}
        {txHash && (
          <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", textAlign: "center", margin: 0, wordBreak: "break-all" }}>
            Tx:{" "}
            <a
              href={`${IS_PROD ? "https://basescan.org" : "https://sepolia.basescan.org"}/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#6366f1" }}
            >
              {txHash.slice(0, 10)}…{txHash.slice(-6)}
            </a>
          </p>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
