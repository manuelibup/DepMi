import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { registerAddress, getDeliveryQuote } from '@/lib/shipbubble'

/**
 * Shipbubble requires names with only letters and spaces (e.g. "John Doe").
 * Strip numbers and symbols, collapse whitespace, fallback to a generic name.
 */
function sanitizeName(raw: string | null | undefined, fallback: string): string {
    const clean = (raw ?? '').replace(/[^a-zA-Z\s]/g, '').replace(/\s+/g, ' ').trim()
    return clean || fallback
}

/**
 * POST /api/delivery/quote
 * Returns a live GIGL delivery quote for the checkout page.
 * Saves the Shipbubble address code on the Store (cached for future quotes).
 */
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
        storeId,
        deliveryAddress,   // street
        deliveryCity,
        deliveryState,
        productTitle,
        productPrice,
        quantity = 1,
    } = body

    if (!storeId || !deliveryAddress || !deliveryCity || !deliveryState) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    try {
        const [store, buyer] = await Promise.all([
            prisma.store.findUnique({
                where: { id: storeId },
                select: {
                    id: true,
                    name: true,
                    dispatchEnabled: true,
                    pickupAddress: true,
                    storeState: true,
                    location: true,
                    shipbubbleAddrCode: true,
                    owner: { select: { email: true, phoneNumber: true } },
                },
            }),
            prisma.user.findUnique({
                where: { id: session.user.id },
                select: { displayName: true, email: true, phoneNumber: true },
            }),
        ])

        if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })
        if (!store.dispatchEnabled) {
            return NextResponse.json({ dispatchEnabled: false })
        }
        if (!store.pickupAddress) {
            return NextResponse.json({
                error: 'Store has no pickup address configured',
                userHint: 'Using estimate — seller hasn\'t set a pickup address yet',
            }, { status: 422 })
        }
        if (!store.storeState) {
            return NextResponse.json({
                error: 'Store has no state configured',
                userHint: 'Using estimate — seller hasn\'t set their state yet',
            }, { status: 422 })
        }

        // Derive store city from location field (e.g. "Uyo, Akwa Ibom" → "Uyo")
        const storeCity = (store.location ?? '').split(',')[0].trim() || 'Unknown'
        const storeState = store.storeState ?? 'Unknown'

        // Register / reuse sender address code.
        let senderCode = store.shipbubbleAddrCode
        if (!senderCode) {
            senderCode = await registerAddress({
                name: sanitizeName(store.name, 'DepMi Store'),
                email: store.owner.email ?? `store-${store.id}@depmi.app`,
                phone: store.owner.phoneNumber ?? '08000000000',
                address: store.pickupAddress,
                city: storeCity,
                state: storeState,
            })
            // Cache it
            await prisma.store.update({
                where: { id: store.id },
                data: { shipbubbleAddrCode: senderCode },
            })
        }

        // Register receiver address (buyer) — street only; city/state are separate fields.
        const receiverCode = await registerAddress({
            name: sanitizeName(buyer?.displayName, 'DepMi Buyer'),
            email: buyer?.email ?? `buyer-${session.user.id}@depmi.app`,
            phone: buyer?.phoneNumber ?? '08000000000',
            address: deliveryAddress,
            city: deliveryCity,
            state: deliveryState,
        })

        const quote = await getDeliveryQuote(senderCode, receiverCode, {
            name: productTitle ?? 'Order',
            weightKg: 1,         // default 1kg — sellers can set this later
            valueNgn: Number(productPrice ?? 0) * quantity,
            quantity,
        })

        return NextResponse.json({
            dispatchEnabled: true,
            fee: quote.fee,
            rawFee: quote.rawFee,
            requestToken: quote.requestToken,
            eta: quote.eta,
        })
    } catch (err: any) {
        console.error('[delivery/quote] Error:', err)
        const msg: string = err.message ?? ''
        const lower = msg.toLowerCase()
        const userHint = lower.includes('validate') || lower.includes('address')
            ? 'Address check failed — courier couldn\'t verify the street/city/state'
            : lower.includes('no') && lower.includes('rates')
            ? 'No dispatch routes available for this location'
            : lower.includes('auth') || lower.includes('unauthorized') || lower.includes('token')
            ? 'Dispatch API auth error — check SHIPBUBBLE_API_KEY in Vercel env'
            : lower.includes('network') || lower.includes('fetch')
            ? 'Couldn\'t reach dispatch API — network error'
            : `Dispatch error: ${msg.slice(0, 80)}`
        return NextResponse.json(
            { error: msg || 'Failed to fetch delivery quote', userHint },
            { status: 502 }
        )
    }
}
