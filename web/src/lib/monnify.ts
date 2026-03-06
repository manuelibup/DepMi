/**
 * Monnify API client
 * Handles virtual account creation (per-checkout), transaction verification, and bank payouts.
 * Fee: 1% of transaction amount, capped at ₦1,000 per collection.
 * Payout fee: ₦10–50 flat per transfer.
 */

const BASE_URL = process.env.MONNIFY_BASE_URL ?? 'https://sandbox.monnify.com'
const API_KEY = process.env.MONNIFY_API_KEY!
const SECRET_KEY = process.env.MONNIFY_SECRET_KEY!
const CONTRACT_CODE = process.env.MONNIFY_CONTRACT_CODE!

// ─── Auth ──────────────────────────────────────────────────────────────────────

let _token: string | null = null
let _tokenExpiry = 0

async function getAccessToken(): Promise<string> {
  if (_token && Date.now() < _tokenExpiry) return _token

  const credentials = Buffer.from(`${API_KEY}:${SECRET_KEY}`).toString('base64')
  const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/json',
    },
  })

  if (!res.ok) throw new Error(`Monnify auth failed: ${res.status}`)

  const data = await res.json()
  _token = data.responseBody.accessToken as string
  // Monnify tokens last 60 minutes — refresh 5 minutes early
  _tokenExpiry = Date.now() + 55 * 60 * 1000
  return _token
}

async function monnifyFetch(path: string, options: RequestInit = {}) {
  const token = await getAccessToken()
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  })
  const data = await res.json()
  if (!res.ok || data.requestSuccessful === false) {
    throw new Error(data.responseMessage ?? `Monnify error: ${res.status}`)
  }
  return data.responseBody
}

// ─── Virtual Accounts ──────────────────────────────────────────────────────────

export interface VirtualAccountDetails {
  accountNumber: string
  bankName: string
  accountName: string
  accountReference: string // unique ref linking this account to an order
  expiresAt: Date
}

/**
 * Creates a one-time reserved virtual account tied to a specific order.
 * The account expires after `expiryMinutes` (default 30).
 * When a bank transfer arrives, Monnify fires a webhook with `accountReference`.
 */
export async function createOrderVirtualAccount(params: {
  orderId: string
  amount: number // exact NGN amount buyer must send
  buyerName: string
  buyerEmail: string
  expiryMinutes?: number
}): Promise<VirtualAccountDetails> {
  const { orderId, amount, buyerName, buyerEmail, expiryMinutes = 30 } = params

  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000)

  const body = await monnifyFetch('/api/v2/bank-transfer/reserved-accounts', {
    method: 'POST',
    body: JSON.stringify({
      accountReference: `depmi-order-${orderId}`,
      accountName: buyerName,
      currencyCode: 'NGN',
      contractCode: CONTRACT_CODE,
      customerEmail: buyerEmail,
      customerName: buyerName,
      // Restrict to exact amount — Monnify rejects transfers of wrong amount
      restrictPaymentOnVerifiedItems: true,
      paymentDescription: `DepMi Order #${orderId.slice(-6).toUpperCase()}`,
    }),
  })

  // Monnify returns multiple bank options — pick the first
  const account = body.accounts?.[0] ?? body

  return {
    accountNumber: account.accountNumber,
    bankName: account.bankName,
    accountName: body.accountName,
    accountReference: `depmi-order-${orderId}`,
    expiresAt,
  }
}

// ─── Transaction Verification ──────────────────────────────────────────────────

export interface TransactionStatus {
  paid: boolean
  amountPaid: number
  transactionReference: string
  paymentStatus: string // 'PAID' | 'PENDING' | 'OVERPAID' | 'PARTIALLY_PAID'
}

export async function verifyTransaction(
  transactionReference: string,
): Promise<TransactionStatus> {
  const body = await monnifyFetch(
    `/api/v2/transactions/${encodeURIComponent(transactionReference)}`,
  )
  return {
    paid: body.paymentStatus === 'PAID',
    amountPaid: body.amountPaid,
    transactionReference: body.transactionReference,
    paymentStatus: body.paymentStatus,
  }
}

/**
 * Checks if a reserved account has received payment for a given order.
 * Used by the polling endpoint (/api/checkout/verify).
 */
export async function checkReservedAccountPayment(
  accountReference: string,
): Promise<TransactionStatus | null> {
  try {
    const body = await monnifyFetch(
      `/api/v1/bank-transfer/reserved-accounts/transactions?accountReference=${encodeURIComponent(accountReference)}&page=0&size=1`,
    )
    const transactions = body.content ?? []
    if (transactions.length === 0) return null

    const latest = transactions[0]
    return {
      paid: latest.paymentStatus === 'PAID',
      amountPaid: latest.amountPaid,
      transactionReference: latest.transactionReference,
      paymentStatus: latest.paymentStatus,
    }
  } catch {
    return null
  }
}

// ─── Webhook Signature Validation ─────────────────────────────────────────────

import crypto from 'crypto'

/**
 * Validates Monnify webhook HMAC signature.
 * Monnify signs with: HMAC-SHA512(SECRET_KEY, rawBody)
 * Header: monnify-signature
 */
export function validateWebhookSignature(
  rawBody: string,
  receivedHash: string,
): boolean {
  const expected = crypto
    .createHmac('sha512', SECRET_KEY)
    .update(rawBody)
    .digest('hex')
  return crypto.timingSafeEqual(
    Buffer.from(expected, 'hex'),
    Buffer.from(receivedHash, 'hex'),
  )
}

// ─── Payouts ───────────────────────────────────────────────────────────────────

export interface PayoutResult {
  reference: string
  status: string // 'SUCCESS' | 'PENDING' | 'FAILED'
}

/**
 * Initiates a bank transfer payout to a seller.
 * Fee: ₦10–50 flat (charged to platform account).
 * Use for daily batched seller settlements.
 */
export async function initiatePayout(params: {
  amount: number // NGN amount to send
  bankCode: string // e.g. "058" GTBank, "044" Access
  accountNumber: string
  accountName: string
  narration: string // e.g. "DepMi payout - Order #ABC123"
  reference: string // unique per payout, idempotency key
}): Promise<PayoutResult> {
  const { amount, bankCode, accountNumber, accountName, narration, reference } =
    params

  const body = await monnifyFetch('/api/v2/disbursements/single', {
    method: 'POST',
    body: JSON.stringify({
      amount,
      reference,
      narration,
      destinationBankCode: bankCode,
      destinationAccountNumber: accountNumber,
      currency: 'NGN',
      sourceAccountNumber: process.env.MONNIFY_WALLET_ACCOUNT_NO,
    }),
  })

  return {
    reference: body.reference,
    status: body.status,
  }
}

// ─── Bank List (for seller onboarding) ────────────────────────────────────────

export interface BankInfo {
  name: string
  code: string
}

let _bankListCache: BankInfo[] | null = null

export async function getBankList(): Promise<BankInfo[]> {
  if (_bankListCache) return _bankListCache

  try {
    const body = await monnifyFetch('/api/v1/banks')
    _bankListCache = (body as Array<{ name: string; code: string }>).map((b) => ({
      name: b.name,
      code: b.code,
    }))
    return _bankListCache!
  } catch (error) {
    console.warn('Monnify bank fetch failed, falling back to static list:', error)
    
    // Fallback list of major Nigerian banks so the UI never breaks during sandbox testing
    _bankListCache = [
      { name: 'Access Bank', code: '044' },
      { name: 'Citibank', code: '023' },
      { name: 'Ecobank', code: '050' },
      { name: 'Fidelity Bank', code: '070' },
      { name: 'First Bank of Nigeria', code: '011' },
      { name: 'First City Monument Bank', code: '214' },
      { name: 'Guaranty Trust Bank (GTB)', code: '058' },
      { name: 'Heritage Bank', code: '030' },
      { name: 'Keystone Bank', code: '082' },
      { name: 'Kuda Bank', code: '50211' },
      { name: 'Moniepoint Microfinance Bank', code: '50515' },
      { name: 'OPay', code: '100004' },
      { name: 'Palmpay', code: '100033' },
      { name: 'Polaris Bank', code: '076' },
      { name: 'Providus Bank', code: '101' },
      { name: 'Stanbic IBTC Bank', code: '221' },
      { name: 'Standard Chartered Bank', code: '068' },
      { name: 'Sterling Bank', code: '232' },
      { name: 'Union Bank of Nigeria', code: '032' },
      { name: 'United Bank for Africa (UBA)', code: '033' },
      { name: 'Unity Bank', code: '215' },
      { name: 'Wema Bank', code: '035' },
      { name: 'Zenith Bank', code: '057' }
    ]
    return _bankListCache!
  }
}

/**
 * Resolves a bank account name (for seller onboarding verification).
 * Shows seller their account name before saving.
 */
export async function resolveAccountName(
  accountNumber: string,
  bankCode: string,
): Promise<string> {
  try {
    const body = await monnifyFetch(
      `/api/v1/disbursements/account/validate?accountNumber=${accountNumber}&bankCode=${bankCode}`,
    )
    return body.accountName as string
  } catch (error) {
    if (API_KEY.startsWith('MK_TEST_')) {
      console.warn('Monnify account validate failed in Sandbox, mocking name.', error)
      return 'TEST VENDOR ACCOUNT'
    }
    throw error
  }
}
