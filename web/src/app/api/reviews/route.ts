import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const reviewSchema = z.object({
    orderId: z.string().uuid(),
    rating: z.number().int().min(1).max(5),
    text: z.string().max(500).optional(),
    productId: z.string().uuid().optional(),
})

// GET /api/reviews?productId=xxx — public, returns reviews + summary
export async function GET(req: NextRequest) {
    const productId = req.nextUrl.searchParams.get('productId')
    if (!productId) {
        return NextResponse.json({ error: 'productId required' }, { status: 400 })
    }

    const reviews = await prisma.review.findMany({
        where: { productId },
        select: {
            id: true,
            rating: true,
            text: true,
            createdAt: true,
            buyer: { select: { displayName: true, avatarUrl: true, username: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
    })

    const count = reviews.length
    const avgRating = count > 0
        ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10
        : 0

    return NextResponse.json({ reviews, avgRating, count })
}

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

    const { orderId, rating, text, productId } = parsed.data

    // Verify the order belongs to this buyer and is COMPLETED
    const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: {
            buyerId: true,
            sellerId: true,
            status: true,
            items: { select: { productId: true }, take: 1 },
        },
    })

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (order.buyerId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (order.status !== 'COMPLETED') {
        return NextResponse.json({ error: 'Can only review completed orders' }, { status: 400 })
    }

    // One review per order
    const existing = await prisma.review.findUnique({ where: { orderId } })
    if (existing) return NextResponse.json({ error: 'Already reviewed' }, { status: 409 })

    // Prefer client-provided productId, fall back to first order item
    const resolvedProductId = productId ?? order.items[0]?.productId ?? null

    const review = await prisma.$transaction(async (tx) => {
        const r = await tx.review.create({
            data: {
                orderId,
                buyerId: session.user.id,
                storeId: order.sellerId,
                productId: resolvedProductId,
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
