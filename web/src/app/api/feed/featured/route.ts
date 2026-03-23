import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const STORE_COLORS = ['#1A1D1F', '#0984E3', '#00B894', '#D63031', '#6C5CE7', '#E17055'];

export async function GET() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawProducts = await (prisma.product as any).findMany({
        where: { stock: { gt: 0 }, inStock: true },
        orderBy: { viewCount: 'desc' },
        take: 12,
        include: {
            store: { select: { name: true, slug: true } },
            images: { take: 1, select: { url: true } },
        },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const products = rawProducts.map((p: any) => ({
        id: p.id,
        title: p.title,
        price: `₦${Number(p.price).toLocaleString()}`,
        image: p.images?.[0]?.url ?? '',
        store: p.store.name,
        storeSlug: p.store.slug,
        storeColor: STORE_COLORS[p.store.name.length % STORE_COLORS.length],
        storeInitial: p.store.name.charAt(0).toUpperCase(),
    }));

    return NextResponse.json({ products }, {
        headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300' },
    });
}
