/**
 * Yellow Card API client — NGN↔USDC ramp
 * Used ONLY for cross-rail transactions (V2 feature):
 *   - Naira buyer → USDC seller (on-ramp)
 *   - USDC buyer → Naira seller (off-ramp)
 *
 * For V1 Phase 3: rails are separate (naira stays naira, crypto stays crypto).
 * This file is a stub ready for activation in Phase 4 when SEC VASP registration is obtained.
 *
 * Yellow Card API docs: https://developer.yellowcard.io
 * Requires: YELLOW_CARD_API_KEY, YELLOW_CARD_SECRET_KEY in .env.local
 */

const BASE_URL = process.env.YELLOW_CARD_BASE_URL ?? 'https://sandbox.api.yellowcard.io'
const API_KEY = process.env.YELLOW_CARD_API_KEY!
const SECRET_KEY = process.env.YELLOW_CARD_SECRET_KEY!

import crypto from 'crypto'

// ── Auth ───────────────────────────────────────────────────────────────────────

function generateSignature(method: string, path: string, body: string): string {
  const timestamp = Date.now().toString()
  const message = `${timestamp}${method.toUpperCase()}${path}${body}`
  const signature = crypto.createHmac('sha256', SECRET_KEY).update(message).digest('hex')
  return `${timestamp}:${signature}`
}

async function yellowFetch(path: string, options: RequestInit = {}) {
  const body = options.body ? String(options.body) : ''
  const method = options.method ?? 'GET'
  const signature = generateSignature(method, path, body)

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'X-YC-Timestamp': signature.split(':')[0],
      'X-YC-Signature': signature.split(':')[1],
      'X-YC-Key': API_KEY,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.message ?? `Yellow Card error: ${res.status}`)
  return data
}

// ── Rate Quotes ────────────────────────────────────────────────────────────────

export interface RateQuote {
  ngnPerUsdc: number     // e.g. 1620 NGN per 1 USDC
  usdcPerNgn: number     // inverse
  validUntil: Date       // quotes expire quickly
  quoteId: string
}

/**
 * Get current NGN/USDC exchange rate.
 * Lock rate for 60 seconds during checkout to show buyer exact amount.
 */
export async function getRate(): Promise<RateQuote> {
  const data = await yellowFetch('/v1/rates?currency=NGN&crypto=USDC')
  return {
    ngnPerUsdc: data.buy,
    usdcPerNgn: 1 / data.sell,
    validUntil: new Date(Date.now() + 60_000),
    quoteId: data.id ?? crypto.randomUUID(),
  }
}

// ── On-Ramp (NGN → USDC) ───────────────────────────────────────────────────────

export interface OnRampResult {
  paymentId: string
  destinationUsdc: number  // USDC amount that will arrive
  feeNgn: number           // Yellow Card's fee in NGN
  totalNgn: number         // Total NGN buyer must send
  expiresAt: Date
}

/**
 * PHASE 4 ONLY — requires SEC VASP registration.
 * Initiates an NGN → USDC conversion.
 * Buyer sends NGN via bank transfer, USDC arrives at destinationAddress.
 */
export async function initiateOnRamp(params: {
  ngnAmount: number
  destinationAddress: string  // Escrow contract address or buyer's wallet
  quoteId: string
}): Promise<OnRampResult> {
  const data = await yellowFetch('/v1/payments', {
    method: 'POST',
    body: JSON.stringify({
      sourceCurrency: 'NGN',
      destinationCurrency: 'USDC',
      sourceAmount: params.ngnAmount,
      destinationAddress: params.destinationAddress,
      network: 'base',
      quoteId: params.quoteId,
    }),
  })

  return {
    paymentId: data.id,
    destinationUsdc: data.destinationAmount,
    feeNgn: data.fee,
    totalNgn: data.sourceAmount,
    expiresAt: new Date(data.expiresAt),
  }
}

// ── Off-Ramp (USDC → NGN) ──────────────────────────────────────────────────────

export interface OffRampResult {
  paymentId: string
  ngnAmount: number     // NGN that will arrive in seller's bank
  feeUsdc: number       // Yellow Card fee in USDC
  status: string
}

/**
 * PHASE 4 ONLY — requires SEC VASP registration.
 * Converts USDC to NGN and sends to seller's bank account.
 * Call after escrow contract emits OrderConfirmed event.
 */
export async function initiateOffRamp(params: {
  usdcAmount: number
  bankCode: string
  accountNumber: string
  accountName: string
  quoteId: string
}): Promise<OffRampResult> {
  const data = await yellowFetch('/v1/payments', {
    method: 'POST',
    body: JSON.stringify({
      sourceCurrency: 'USDC',
      destinationCurrency: 'NGN',
      sourceAmount: params.usdcAmount,
      network: 'base',
      quoteId: params.quoteId,
      bankDetails: {
        bankCode: params.bankCode,
        accountNumber: params.accountNumber,
        accountName: params.accountName,
      },
    }),
  })

  return {
    paymentId: data.id,
    ngnAmount: data.destinationAmount,
    feeUsdc: data.fee,
    status: data.status,
  }
}

// ── Payment Status ─────────────────────────────────────────────────────────────

export async function getPaymentStatus(paymentId: string): Promise<{
  status: string  // 'pending' | 'processing' | 'settled' | 'failed'
  ngnAmount?: number
  usdcAmount?: number
}> {
  const data = await yellowFetch(`/v1/payments/${paymentId}`)
  return {
    status: data.status,
    ngnAmount: data.destinationCurrency === 'NGN' ? data.destinationAmount : undefined,
    usdcAmount: data.destinationCurrency === 'USDC' ? data.destinationAmount : undefined,
  }
}
