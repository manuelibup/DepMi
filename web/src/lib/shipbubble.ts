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

    // Shipbubble requires the address field to include city, state and country
    // (per their validation error message), in addition to the separate city/state fields.
    const fullAddress = `${data.address}, ${data.city}, ${data.state}, Nigeria`

    const payload = {
        name: data.name,
        email: data.email,
        phone,
        address: fullAddress,
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

// ─── Categories ──────────────────────────────────────────────────────────────

/** Module-level cache so we only hit Shipbubble once per cold start */
let _categoryId: number | null = null

/**
 * Fetch available package categories and return the ID of the first
 * general/parcel-type category. Falls back to the raw numeric value of
 * the first category if no "general" keyword is found.
 */
async function getDefaultCategoryId(): Promise<number> {
    if (_categoryId !== null) return _categoryId

    const res = await fetch(`${BASE_URL}/shipping/categories`, {
        headers: authHeaders(),
    })
    const json = await res.json()
    console.log('[shipbubble] categories:', res.status, JSON.stringify(json))

    const cats: any[] = json.data ?? json.categories ?? []
    if (!cats.length) throw new Error('Shipbubble: no package categories returned')

    // Prefer a category whose name contains "general", "parcel", or "others"
    const preferred = cats.find((c: any) => {
        const n = (c.name ?? c.category_name ?? '').toLowerCase()
        return n.includes('general') || n.includes('parcel') || n.includes('others')
    })
    const cat = preferred ?? cats[0]
    _categoryId = Number(cat.id ?? cat.category_id)
    return _categoryId!
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
    const [pickupDate, categoryId] = await Promise.all([
        Promise.resolve(
            new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        ),
        getDefaultCategoryId(),
    ])

    const ratePayload = {
        sender_address_code: senderAddressCode,
        recipient_address_code: receiverAddressCode,
        pickup_date: pickupDate,
        category_id: categoryId,
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
    }

    console.log('[shipbubble] fetch_rates payload:', JSON.stringify(ratePayload))

    const res = await fetch(`${BASE_URL}/shipping/fetch_rates`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(ratePayload),
    })

    const json = await res.json()
    console.log('[shipbubble] fetch_rates response:', res.status, JSON.stringify(json))

    if (!res.ok) throw new Error(json.message ?? 'Shipbubble: failed to fetch rates')

    // All available rates — filter for GIGL (GIG Logistics) if present, else take cheapest overall
    const allRates: any[] = json.data?.rates ?? []
    if (!allRates.length) throw new Error('Shipbubble: no rates available for this route')

    const giglRates = allRates.filter((r: any) =>
        (r.courier_id ?? r.courier ?? r.name ?? '').toString().toLowerCase().includes('gigl') ||
        (r.courier_id ?? r.courier ?? r.name ?? '').toString().toLowerCase().includes('gig')
    )
    const rates = giglRates.length > 0 ? giglRates : allRates

    // Pick cheapest available rate
    const rate = rates.reduce((a: any, b: any) =>
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
