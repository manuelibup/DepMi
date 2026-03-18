import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { registerAddress, getDeliveryQuote } from '@/lib/shipbubble'

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
            return NextResponse.json({ error: 'Store has no pickup address configured' }, { status: 422 })
        }

        // Derive store city from location field (e.g. "Uyo, Akwa Ibom" → "Uyo")
        const storeCity = (store.location ?? '').split(',')[0].trim() || 'Unknown'
        const storeState = store.storeState ?? 'Unknown'

        // Register / reuse sender address code
        let senderCode = store.shipbubbleAddrCode
        if (!senderCode) {
            senderCode = await registerAddress({
                name: store.name,
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

        // Register receiver address (buyer) — fresh per quote, no caching needed
        const receiverCode = await registerAddress({
            name: buyer?.displayName ?? 'Buyer',
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
        return NextResponse.json(
            { error: err.message ?? 'Failed to fetch delivery quote' },
            { status: 502 }
        )
    }
}
