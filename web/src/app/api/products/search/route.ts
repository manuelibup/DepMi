import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
    const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';

    if (q.length < 2) {
        return NextResponse.json([]);
    }

    const products = await prisma.product.findMany({
        where: {
            inStock: true,
            OR: [
                { title: { contains: q, mode: 'insensitive' } },
                { store: { name: { contains: q, mode: 'insensitive' } } },
            ]
        },
        select: {
            id: true,
            title: true,
            price: true,
            images: { take: 1, select: { url: true }, orderBy: { order: 'asc' } },
            store: { select: { name: true } }
        },
        take: 10,
    });

    return NextResponse.json(
        products.map(p => ({
            id: p.id,
            title: p.title,
            price: Number(p.price),
            imageUrl: p.images[0]?.url ?? '',
            storeName: p.store.name,
        }))
    );
}
