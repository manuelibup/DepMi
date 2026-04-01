import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/** Returns the query plus common singular/root forms so "laptops" also matches "laptop". */
function stemVariants(q: string): string[] {
    const terms = [q];
    const l = q.toLowerCase();
    if (l.endsWith('ies') && l.length > 4) terms.push(q.slice(0, -3) + 'y');        // accessories → accessory
    else if (l.endsWith('ves') && l.length > 4) terms.push(q.slice(0, -3) + 'f');    // knives → knife
    else if (/(?:ses|xes|zes|ches|shes)$/.test(l) && l.length > 4) terms.push(q.slice(0, -2)); // watches → watch
    else if (l.endsWith('s') && !l.endsWith('ss') && l.length > 3) terms.push(q.slice(0, -1)); // laptops → laptop
    return [...new Set(terms)];
}

export async function GET(req: NextRequest) {
    const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';

    if (q.length < 2) {
        return NextResponse.json([]);
    }

    const terms = stemVariants(q);
    const products = await prisma.product.findMany({
        where: {
            inStock: true,
            OR: terms.flatMap(t => [
                { title: { contains: t, mode: 'insensitive' as const } },
                { store: { name: { contains: t, mode: 'insensitive' as const } } },
            ]),
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
