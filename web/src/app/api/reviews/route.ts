import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const reviewSchema = z.object({
    orderId: z.string().uuid(),
    rating: z.number().int().min(1).max(5),
    text: z.string().max(500).optional(),
})

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = reviewSchema.safeParse(body)
    if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid input', errors: parsed.error.format() }, { status: 400 })
    }

    const { orderId, rating, text } = parsed.data

    // Verify the order belongs to this buyer and is COMPLETED
    const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: { buyerId: true, sellerId: true, status: true },
    })

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (order.buyerId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (order.status !== 'COMPLETED') {
        return NextResponse.json({ error: 'Can only review completed orders' }, { status: 400 })
    }

    // One review per order
    const existing = await prisma.review.findUnique({ where: { orderId } })
    if (existing) return NextResponse.json({ error: 'Already reviewed' }, { status: 409 })

    const review = await prisma.$transaction(async (tx) => {
        const r = await tx.review.create({
            data: {
                orderId,
                buyerId: session.user.id,
                storeId: order.sellerId,
                rating,
                text,
            },
        })

        // Update store rating average
        const allReviews = await tx.review.findMany({
            where: { storeId: order.sellerId },
            select: { rating: true },
        })
        const avg = allReviews.reduce((sum, rv) => sum + rv.rating, 0) / allReviews.length
        await tx.store.update({
            where: { id: order.sellerId },
            data: {
                rating: Math.round(avg * 10) / 10,
                reviewCount: allReviews.length,
            },
        })

        return r
    })

    return NextResponse.json({ ok: true, review }, { status: 201 })
}
