/**
 * Flutterwave API client
 * Handles payment initialization, verification, bank payouts, and bank lookups.
 * Fee: 1.4% for local card payments. Bank transfers handled by Flutterwave inline.
 */

const BASE_URL = 'https://api.flutterwave.com/v3'
const SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY!

async function flwFetch(path: string, options: RequestInit = {}) {
    const res = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: {
            Authorization: `Bearer ${SECRET_KEY}`,
            'Content-Type': 'application/json',
            ...(options.headers ?? {}),
        },
    })
    const data = await res.json()
    if (!res.ok || data.status === 'error') {
        throw new Error(data.message ?? `Flutterwave error: ${res.status}`)
    }
    return data.data
}

// ─── Payment Initialization ────────────────────────────────────────────────────

export interface PaymentInit {
    paymentLink: string
    txRef: string
}

/**
 * Creates a Flutterwave hosted payment link for an order.
 * Buyer is redirected to this link to pay via card, bank transfer, or USSD.
 */
export async function initializePayment(params: {
    orderId: string
    amount: number
    buyerName: string
    buyerEmail: string
    buyerPhone?: string
    description?: string
}): Promise<PaymentInit> {
    const { orderId, amount, buyerName, buyerEmail, buyerPhone, description } = params
    const txRef = `depmi-order-${orderId}`

    const baseUrl = process.env.NEXTAUTH_URL ?? 'https://www.depmi.com'

    const body = await fetch(`${BASE_URL}/payments`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${SECRET_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            tx_ref: txRef,
            amount,
            currency: 'NGN',
            redirect_url: `${baseUrl}/api/checkout/callback`,
            customer: {
                email: buyerEmail,
                name: buyerName,
                phonenumber: buyerPhone ?? '',
            },
            meta: { orderId },
            customizations: {
                title: 'DepMi Secure Checkout',
                description: description ?? 'Escrow-protected purchase',
                logo: `${baseUrl}/depmi-logo.svg`,
            },
        }),
    }).then(r => r.json())

    if (body.status === 'error') throw new Error(body.message)

    return {
        paymentLink: body.data.link,
        txRef,
    }
}

// ─── Transaction Verification ──────────────────────────────────────────────────

export interface TransactionStatus {
    paid: boolean
    amountPaid: number
    txRef: string
    flwRef: string
    status: string
}

export async function verifyTransaction(transactionId: string): Promise<TransactionStatus> {
    const data = await flwFetch(`/transactions/${transactionId}/verify`)
    return {
        paid: data.status === 'successful',
        amountPaid: data.amount,
        txRef: data.tx_ref,
        flwRef: data.flw_ref,
        status: data.status,
    }
}

export async function verifyByTxRef(txRef: string): Promise<TransactionStatus | null> {
    try {
        const data = await flwFetch(`/transactions?tx_ref=${encodeURIComponent(txRef)}`)
        const tx = Array.isArray(data) ? data[0] : null
        if (!tx) return null
        return {
            paid: tx.status === 'successful',
            amountPaid: tx.amount,
            txRef: tx.tx_ref,
            flwRef: tx.flw_ref,
            status: tx.status,
        }
    } catch {
        return null
    }
}

// ─── Webhook Signature Validation ─────────────────────────────────────────────

/**
 * Validates Flutterwave webhook by comparing the verif-hash header
 * to the FLUTTERWAVE_SECRET_HASH env var (set in Flutterwave dashboard → Webhooks).
 */
export function validateWebhookSignature(receivedHash: string): boolean {
    const secretHash = process.env.FLUTTERWAVE_SECRET_HASH ?? ''
    if (!secretHash) return false
    return receivedHash === secretHash
}

// ─── Payouts ───────────────────────────────────────────────────────────────────

export interface PayoutResult {
    reference: string
    status: string
}

/**
 * Initiates a bank transfer payout to a seller.
 * Uses Flutterwave Transfer API.
 */
export async function initiatePayout(params: {
    amount: number
    bankCode: string
    accountNumber: string
    accountName: string
    narration: string
    reference: string
}): Promise<PayoutResult> {
    const { amount, bankCode, accountNumber, narration, reference } = params

    const data = await flwFetch('/transfers', {
        method: 'POST',
        body: JSON.stringify({
            account_bank: bankCode,
            account_number: accountNumber,
            amount,
            currency: 'NGN',
            narration,
            reference,
            debit_currency: 'NGN',
        }),
    })

    return {
        reference: data.reference,
        status: data.status,
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
        const data = await flwFetch('/banks/NG')
        _bankListCache = (data as Array<{ name: string; code: string }>).map(b => ({
            name: b.name,
            code: b.code,
        }))
        return _bankListCache!
    } catch (error) {
        console.warn('Flutterwave bank fetch failed, falling back to static list:', error)

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

// ─── Bank Transfer (Virtual Account) ──────────────────────────────────────────

export interface BankTransferCharge {
    orderId: string
    accountNumber: string
    bankName: string
    amount: number
    expiresAt: string
    txRef: string
    flwRef: string
}

/**
 * Initiates a bank transfer charge via Flutterwave.
 * Returns a temporary virtual account number the buyer transfers to.
 * No redirect needed — fully server-side.
 */
export async function initializeBankTransfer(params: {
    orderId: string
    amount: number
    buyerName: string
    buyerEmail: string
}): Promise<BankTransferCharge> {
    const { orderId, amount, buyerName, buyerEmail } = params
    const txRef = `depmi-order-${orderId}`

    const res = await fetch(`${BASE_URL}/charges?type=bank_transfer`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${SECRET_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            tx_ref: txRef,
            amount,
            currency: 'NGN',
            email: buyerEmail,
            fullname: buyerName,
            is_permanent: false,
        }),
    })

    const body = await res.json()
    if (body.status === 'error') throw new Error(body.message)

    const auth = body.data?.meta?.authorization
    if (!auth?.account_number) throw new Error('No virtual account returned from Flutterwave')

    return {
        orderId,
        txRef,
        flwRef: body.data.flw_ref ?? '',
        accountNumber: auth.account_number,
        bankName: auth.transfer_bank ?? 'Wema Bank',
        amount,
        expiresAt: auth.expiry_date ?? '',
    }
}

// ─── Account Resolution ────────────────────────────────────────────────────────

export async function resolveAccountName(
    accountNumber: string,
    bankCode: string,
): Promise<string> {
    const data = await flwFetch('/accounts/resolve', {
        method: 'POST',
        body: JSON.stringify({
            account_number: accountNumber,
            account_bank: bankCode,
        }),
    })
    return data.account_name as string
}
