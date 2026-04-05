/**
 * ThirdWeb SDK helpers for DepMi crypto payment rail.
 *
 * Chain: Base L2 (mainnet chainId 8453, Sepolia testnet 84532)
 * Token: USDC (stablecoin, 6 decimals)
 * Contract: DepMiEscrow — EscrowManager at ESCROW_CONTRACT_ADDRESS
 *
 * Server-side signing (Phase A) uses DEPMI_ADMIN_WALLET_KEY env var.
 * Upgrade to ThirdWeb Engine (Phase B) or Gnosis Safe (Phase C) by
 * changing getAdminWallet() without touching any call sites.
 */

import {
  createThirdwebClient,
  getContract,
  prepareContractCall,
  sendTransaction,
  readContract,
  type ThirdwebClient,
} from "thirdweb";
import { base, baseSepolia } from "thirdweb/chains";
import { privateKeyToAccount } from "thirdweb/wallets";
import { ethers } from "ethers";

// ── Client ────────────────────────────────────────────────────────────────────

export const thirdwebClient: ThirdwebClient = createThirdwebClient({
  secretKey: process.env.THIRDWEB_SECRET_KEY!,
});

// ── Chain + USDC ──────────────────────────────────────────────────────────────

const IS_PROD = process.env.NODE_ENV === "production";

export const activeChain = IS_PROD ? base : baseSepolia;

export const USDC_ADDRESS = IS_PROD
  ? "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"  // Base mainnet
  : "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; // Base Sepolia

export const USDC_DECIMALS = 6;

// ── Escrow contract ───────────────────────────────────────────────────────────

const ESCROW_ABI = [
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
  {
    name: "confirmDelivery",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "orderId", type: "bytes32" }],
    outputs: [],
  },
  {
    name: "raiseDispute",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "orderId", type: "bytes32" }],
    outputs: [],
  },
  {
    name: "adminResolve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "orderId", type: "bytes32" },
      { name: "refundBuyer", type: "bool" },
    ],
    outputs: [],
  },
  {
    name: "cancelOrder",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "orderId", type: "bytes32" },
      { name: "buyerFault", type: "bool" },
    ],
    outputs: [],
  },
  {
    name: "markShipped",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "orderId", type: "bytes32" }],
    outputs: [],
  },
  {
    name: "getOrder",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "orderId", type: "bytes32" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "buyer", type: "address" },
          { name: "seller", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "sellerPayout", type: "uint256" },
          { name: "status", type: "uint8" },
          { name: "createdAt", type: "uint256" },
          { name: "confirmedAt", type: "uint256" },
        ],
      },
    ],
  },
  {
    name: "toOrderId",
    type: "function",
    stateMutability: "pure",
    inputs: [{ name: "uuid", type: "string" }],
    outputs: [{ type: "bytes32" }],
  },
] as const;

export function getEscrowContract() {
  const address = process.env.ESCROW_CONTRACT_ADDRESS;
  if (!address) throw new Error("ESCROW_CONTRACT_ADDRESS not set");
  return getContract({
    client: thirdwebClient,
    chain: activeChain,
    address,
    abi: ESCROW_ABI,
  });
}

// ── Admin wallet (Phase A: server-side private key) ───────────────────────────

function getAdminWallet() {
  const key = process.env.DEPMI_ADMIN_WALLET_KEY;
  if (!key) throw new Error("DEPMI_ADMIN_WALLET_KEY not set");
  return privateKeyToAccount({ client: thirdwebClient, privateKey: key });
}

// ── Order ID conversion ───────────────────────────────────────────────────────

/** Convert a DepMi DB UUID to the bytes32 orderId used in the contract. */
export function uuidToBytes32(uuid: string): `0x${string}` {
  return ethers.keccak256(ethers.toUtf8Bytes(uuid)) as `0x${string}`;
}

/** Convert USDC amount (human-readable, e.g. 12.50) to contract units (6 decimals). */
export function usdcToUnits(amount: number): bigint {
  return BigInt(Math.round(amount * 10 ** USDC_DECIMALS));
}

/** Convert contract units to human-readable USDC. */
export function unitsToUsdc(units: bigint): number {
  return Number(units) / 10 ** USDC_DECIMALS;
}

// ── Server-side contract calls ────────────────────────────────────────────────

/**
 * Release escrow to seller after buyer confirms delivery.
 * Called server-side from POST /api/orders/[id]/confirm (crypto branch).
 */
export async function serverConfirmDelivery(orderUuid: string): Promise<string> {
  const contract = getEscrowContract();
  const wallet = getAdminWallet();
  const orderId = uuidToBytes32(orderUuid);

  const tx = prepareContractCall({
    contract,
    method: "confirmDelivery",
    params: [orderId],
  });

  const result = await sendTransaction({ transaction: tx, account: wallet });
  return result.transactionHash;
}

/**
 * Cancel an order on-chain.
 * buyerFault=true → buyer gets 95%, platform gets 5%
 * buyerFault=false → buyer gets 100%, no fee
 */
export async function serverCancelOrder(
  orderUuid: string,
  buyerFault: boolean
): Promise<string> {
  const contract = getEscrowContract();
  const wallet = getAdminWallet();
  const orderId = uuidToBytes32(orderUuid);

  const tx = prepareContractCall({
    contract,
    method: "cancelOrder",
    params: [orderId, buyerFault],
  });

  const result = await sendTransaction({ transaction: tx, account: wallet });
  return result.transactionHash;
}

/**
 * Resolve a dispute.
 * refundBuyer=true → seller fault, full refund to buyer
 * refundBuyer=false → buyer fault, release to seller minus fee
 */
export async function serverResolveDispute(
  orderUuid: string,
  refundBuyer: boolean
): Promise<string> {
  const contract = getEscrowContract();
  const wallet = getAdminWallet();
  const orderId = uuidToBytes32(orderUuid);

  const tx = prepareContractCall({
    contract,
    method: "adminResolve",
    params: [orderId, refundBuyer],
  });

  const result = await sendTransaction({ transaction: tx, account: wallet });
  return result.transactionHash;
}

/**
 * Mark an order as shipped on-chain (starts the 7-day dispute window).
 * Called server-side when seller marks order shipped.
 */
export async function serverMarkShipped(orderUuid: string): Promise<string> {
  const contract = getEscrowContract();
  const wallet = getAdminWallet();
  const orderId = uuidToBytes32(orderUuid);

  const tx = prepareContractCall({
    contract,
    method: "markShipped",
    params: [orderId],
  });

  const result = await sendTransaction({ transaction: tx, account: wallet });
  return result.transactionHash;
}

/**
 * Read on-chain order state (for verification).
 */
export async function getOnChainOrder(orderUuid: string) {
  const contract = getEscrowContract();
  const orderId = uuidToBytes32(orderUuid);
  return readContract({ contract, method: "getOrder", params: [orderId] });
}

// ── Status enum (mirrors contract) ───────────────────────────────────────────

export const EscrowStatusOnChain = {
  NONE: 0,
  HELD: 1,
  DISPUTED: 2,
  RELEASED: 3,
  REFUNDED: 4,
} as const;
