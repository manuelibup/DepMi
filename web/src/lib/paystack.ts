/**
 * Paystack API client
 * Handles payment initialization, verification, bank payouts, and bank lookups.
 * Fee: 1.5% + ₦100 for transactions ≥ ₦2,500, capped at ₦2,000.
 *
 * IMPORTANT: Paystack API amounts are in kobo (1 NGN = 100 kobo).
 * All functions accept/return NGN and convert internally.
 *
 * Env vars required:
 *   PAYSTACK_SECRET_KEY — used for both API calls and webhook HMAC validation
 */

import crypto from 'crypto'

const BASE_URL = 'https://api.paystack.co'
const SECRET_KEY = process.env.PAYSTACK_SECRET_KEY!

async function paystackFetch(path: string, options: RequestInit = {}) {
    const res = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: {
            Authorization: `Bearer ${SECRET_KEY}`,
            'Content-Type': 'application/json',
            ...(options.headers ?? {}),
        },
    })
    const data = await res.json()
    if (!res.ok || !data.status) {
        throw new Error(data.message ?? `Paystack error: ${res.status}`)
    }
    return data.data
}

// ─── Payment Initialization ────────────────────────────────────────────────────

export interface PaymentInit {
    paymentLink: string
    txRef: string
}

/**
 * Creates a Paystack hosted payment page for an order.
 * Buyer is redirected to this link to pay via card, bank transfer, or USSD.
 */
export async function initializePayment(params: {
    orderId: string
    amount: number        // NGN — converted to kobo internally
    buyerName: string
    buyerEmail: string
    buyerPhone?: string
    description?: string
}): Promise<PaymentInit> {
    const { orderId, amount, buyerName, buyerEmail, description } = params
    const reference = `depmi-order-${orderId}`

    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://depmi.com'

    const data = await paystackFetch('/transaction/initialize', {
        method: 'POST',
        body: JSON.stringify({
            reference,
            email: buyerEmail,
            amount: Math.round(amount * 100), // NGN → kobo
            currency: 'NGN',
            callback_url: `${baseUrl}/api/checkout/callback`,
            metadata: {
                orderId,
                buyerName,
                custom_fields: [
                    {
                        display_name: 'Order ID',
                        variable_name: 'order_id',
                        value: orderId,
                    },
                ],
            },
            channels: ['card', 'bank', 'ussd', 'bank_transfer'],
            label: description ?? 'DepMi Secure Checkout',
        }),
    })

    return {
        paymentLink: data.authorization_url,
        txRef: reference,
    }
}

// ─── Transaction Verification ──────────────────────────────────────────────────

export interface TransactionStatus {
    paid: boolean
    amountPaid: number   // NGN (converted from kobo)
    txRef: string
    status: string
}

export async function verifyTransaction(reference: string): Promise<TransactionStatus> {
    const data = await paystackFetch(`/transaction/verify/${encodeURIComponent(reference)}`)
    return {
        paid: data.status === 'success',
        amountPaid: data.amount / 100, // kobo → NGN
        txRef: data.reference,
        status: data.status,
    }
}

export async function verifyByTxRef(reference: string): Promise<TransactionStatus | null> {
    try {
        return await verifyTransaction(reference)
    } catch {
        return null
    }
}

// ─── Webhook Signature Validation ─────────────────────────────────────────────

/**
 * Validates Paystack webhook using HMAC-SHA512 of the raw request body,
 * signed with PAYSTACK_SECRET_KEY (same key used for API calls).
 * Header: x-paystack-signature
 */
export function validateWebhookSignature(rawBody: string, signature: string): boolean {
    if (!SECRET_KEY) return false
    const expected = crypto
        .createHmac('sha512', SECRET_KEY)
        .update(rawBody)
        .digest('hex')
    try {
        return crypto.timingSafeEqual(
            Buffer.from(expected, 'hex'),
            Buffer.from(signature, 'hex'),
        )
    } catch {
        return false
    }
}

// ─── Payouts ───────────────────────────────────────────────────────────────────

export interface PayoutResult {
    reference: string
    status: string
}

/**
 * Initiates a bank transfer payout to a seller via Paystack Transfers API.
 * Two-step: creates a transfer recipient then initiates the transfer.
 *
 * NOTE: Requires "Disable OTP for transfers" to be enabled in the Paystack dashboard
 * (Settings → Transfers) so transfers fire programmatically without manual OTP confirmation.
 */
export async function initiatePayout(params: {
    amount: number       // NGN — converted to kobo internally
    bankCode: string
    accountNumber: string
    accountName: string
    narration: string
    reference: string
}): Promise<PayoutResult> {
    const { amount, bankCode, accountNumber, accountName, narration, reference } = params

    // Step 1: Create a transfer recipient (Paystack de-dupes by account_number + bank_code)
    const recipient = await paystackFetch('/transferrecipient', {
        method: 'POST',
        body: JSON.stringify({
            type: 'nuban',
            name: accountName,
            account_number: accountNumber,
            bank_code: bankCode,
            currency: 'NGN',
        }),
    })

    // Step 2: Initiate the transfer from Paystack balance
    const transfer = await paystackFetch('/transfer', {
        method: 'POST',
        body: JSON.stringify({
            source: 'balance',
            amount: Math.round(amount * 100), // NGN → kobo
            recipient: recipient.recipient_code,
            reason: narration,
            reference,
        }),
    })

    return {
        reference: transfer.reference,
        status: transfer.status,
    }
}

// ─── Bank List ─────────────────────────────────────────────────────────────────

export interface BankInfo {
    name: string
    code: string
}

let _bankListCache: BankInfo[] | null = null

export async function getBankList(): Promise<BankInfo[]> {
    if (_bankListCache) return _bankListCache

    try {
        const data = await paystackFetch('/bank?country=nigeria&perPage=100&use_cursor=false')
        _bankListCache = (data as Array<{ name: string; code: string }>).map(b => ({
            name: b.name,
            code: b.code,
        }))
        return _bankListCache!
    } catch (error) {
        console.warn('Paystack bank fetch failed, falling back to static list:', error)
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
            { name: 'Zenith Bank', code: '057' },
        ]
        return _bankListCache!
    }
}

// ─── Account Resolution ────────────────────────────────────────────────────────

export async function resolveAccountName(
    accountNumber: string,
    bankCode: string,
): Promise<string> {
    const data = await paystackFetch(
        `/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`,
    )
    return data.account_name as string
}
