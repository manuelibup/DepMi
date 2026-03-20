/**
 * Shipbubble API wrapper — handles delivery quotes and shipment booking via GIG Logistics.
 * Docs: https://docs.shipbubble.com
 *
 * Address endpoint: POST /v1/shipping/address/validate
 */

const BASE_URL = 'https://api.shipbubble.com/v1'

function authHeaders() {
    return {
        Authorization: `Bearer ${process.env.SHIPBUBBLE_API_KEY}`,
        'Content-Type': 'application/json',
    }
}

function applyMarkup(rawFee: number): number {
    const pct = Number(process.env.SHIPBUBBLE_MARKUP_PERCENT ?? 15) / 100
    return Math.ceil(rawFee * (1 + pct))
}

// ─── Address Registration ────────────────────────────────────────────────────

export interface ShipbubbleAddress {
    name: string
    email: string
    phone: string
    address: string  // street address
    city: string
    state: string
    country?: string
}

/**
 * Register an address with Shipbubble and return its address_code.
 * The code is used in subsequent rate/booking calls.
 */
export async function registerAddress(data: ShipbubbleAddress): Promise<number> {
    // Normalise phone to +234 format (Shipbubble requires international format)
    const phone = data.phone.startsWith('+')
        ? data.phone
        : data.phone.startsWith('234')
        ? `+${data.phone}`
        : data.phone.startsWith('0')
        ? `+234${data.phone.slice(1)}`
        : data.phone

    const payload = {
        name: data.name,
        email: data.email,
        phone,
        address: data.address,
        city: data.city,
        state: data.state,
        country: data.country ?? 'NG',
    }

    console.log('[shipbubble] registerAddress payload:', JSON.stringify(payload))

    const res = await fetch(`${BASE_URL}/shipping/address/validate`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
    })

    const json = await res.json()
    console.log('[shipbubble] registerAddress response:', res.status, JSON.stringify(json))

    if (!res.ok) throw new Error(json.message ?? 'Shipbubble: failed to register address')

    const code = json.data?.address_code ?? json.data?.id
    if (!code) throw new Error('Shipbubble: no address_code in response')
    return Number(code)
}

// ─── Delivery Quote ──────────────────────────────────────────────────────────

export interface QuoteResult {
    /** Fee shown to buyer (includes DepMi markup) */
    fee: number
    /** Raw carrier fee before markup */
    rawFee: number
    /** Token valid 7 days — save on Order for auto-booking after payment */
    requestToken: string
    /** Human-readable ETA e.g. "1-2 days" */
    eta: string | null
}

/**
 * Fetch a live GIGL delivery quote via Shipbubble.
 */
export async function getDeliveryQuote(
    senderAddressCode: number,
    receiverAddressCode: number,
    item: { name: string; weightKg: number; valueNgn: number; quantity: number }
): Promise<QuoteResult> {
    const pickupDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]

    const res = await fetch(`${BASE_URL}/shipping/fetch_rates/gigl`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
            sender_address_code: senderAddressCode,
            receiver_address_code: receiverAddressCode,
            pickup_date: pickupDate,
            category_id: 1,
            package_items: [
                {
                    name: item.name,
                    description: item.name,
                    unit_weight: item.weightKg,
                    unit_amount: item.valueNgn,
                    quantity: item.quantity,
                },
            ],
            package_dimension: { length: 20, width: 15, height: 10 },
        }),
    })

    const json = await res.json()
    if (!res.ok) throw new Error(json.message ?? 'Shipbubble: failed to fetch rates')

    const rates: any[] = json.data?.rates ?? []
    if (!rates.length) throw new Error('Shipbubble: no GIGL rates available for this route')

    // Pick cheapest available rate
    const rate = rates.reduce((a, b) =>
        Number(a.total ?? a.rate_card_amount) <= Number(b.total ?? b.rate_card_amount) ? a : b
    )

    const rawFee = Number(rate.total ?? rate.rate_card_amount)
    return {
        fee: applyMarkup(rawFee),
        rawFee,
        requestToken: json.data.request_token,
        eta: rate.delivery_eta_time ?? rate.eta ?? null,
    }
}

// ─── Book Shipment ───────────────────────────────────────────────────────────

export interface BookingResult {
    shipbubbleOrderId: string
    trackingUrl: string | null
    trackingCode: string | null
}

/**
 * Book a shipment using a saved request token (from getDeliveryQuote).
 * Call this after payment is confirmed.
 */
export async function bookShipment(requestToken: string): Promise<BookingResult> {
    const res = await fetch(`${BASE_URL}/shipping/labels`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
            request_token: requestToken,
            service_code: 'gigl',
            courier_id: 'gigl',
        }),
    })

    const json = await res.json()
    if (!res.ok) throw new Error(json.message ?? 'Shipbubble: failed to book shipment')

    return {
        shipbubbleOrderId: json.data?.order_id ?? json.data?.id ?? '',
        trackingUrl: json.data?.tracking_url ?? null,
        trackingCode: json.data?.tracking_code ?? null,
    }
}

// ─── Track Shipment ──────────────────────────────────────────────────────────

export async function getShipmentStatus(shipbubbleOrderId: string): Promise<{
    status: string
    trackingUrl: string | null
}> {
    const res = await fetch(
        `${BASE_URL}/shipping/labels/list/${shipbubbleOrderId}`,
        { headers: authHeaders() }
    )

    const json = await res.json()
    if (!res.ok) throw new Error(json.message ?? 'Shipbubble: failed to get shipment status')

    const shipment = json.data?.[0] ?? json.data
    return {
        status: shipment?.status ?? 'unknown',
        trackingUrl: shipment?.tracking_url ?? null,
    }
}
