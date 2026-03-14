import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const STORE_COLORS = ['#1A1D1F', '#0984E3', '#00B894', '#D63031', '#6C5CE7', '#E17055'];

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const productCursor = searchParams.get('productCursor');
    const demandCursor = searchParams.get('demandCursor');
    const category = searchParams.get('category') || undefined;
    const take = Math.min(Number(searchParams.get('take') || '10'), 20);

    const session = await getServerSession(authOptions);
    const userId = session?.user?.id ?? null;

    const productWhere: Record<string, unknown> = { stock: { gt: 0 } };
    const demandWhere: Record<string, unknown> = { isActive: true };

    if (category) {
        productWhere.category = category;
        demandWhere.category = category;
    }
    if (productCursor) {
        productWhere.createdAt = { lt: new Date(productCursor) };
    }
    if (demandCursor) {
        demandWhere.createdAt = { lt: new Date(demandCursor) };
    }

    const [rawProducts, rawDemands] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (prisma.product as any).findMany({
            where: productWhere,
            orderBy: { createdAt: 'desc' },
            take,
            include: {
                store: { select: { name: true, slug: true, depCount: true, depTier: true, id: true, ownerId: true, owner: { select: { username: true } } } },
                images: true,
                _count: { select: { likes: true, saves: true, comments: true } },
                ...(userId ? {
                    likes: { where: { userId }, select: { id: true } },
                    saves: { where: { userId }, select: { id: true } },
                } : {}),
            },
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (prisma.demand as any).findMany({
            where: demandWhere,
            orderBy: { createdAt: 'desc' },
            take,
            include: {
                user: { select: { displayName: true, username: true, avatarUrl: true } },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                _count: { select: { bids: true, comments: true, likes: true } as any },
                images: { orderBy: { order: 'asc' }, take: 3, select: { url: true } },
                ...(userId ? {
                    likes: { where: { userId }, select: { id: true } },
                    saves: { where: { userId }, select: { id: true } },
                } : {}),
            },
        }),
    ]);

    // Serialize products
    const products = rawProducts.map((p: any) => ({
        type: 'product' as const,
        createdAt: p.createdAt.toISOString(),
        data: {
            id: p.id,
            store: p.store.name,
            storeSlug: p.store.slug,
            storeInitial: p.store.name.charAt(0).toUpperCase(),
            storeColor: STORE_COLORS[p.store.name.length % STORE_COLORS.length],
            deps: p.store.depCount,
            depTier: p.store.depTier.toLowerCase(),
            title: p.title,
            price: `₦${Number(p.price).toLocaleString()}`,
            location: 'Nationwide',
            image: p.images?.[0]?.url ?? '',
            viewers: p.viewCount,
            ownerId: p.store.ownerId,
            ownerUsername: p.store.owner.username,
            likeCount: p._count.likes,
            saveCount: p._count.saves,
            commentCount: p._count.comments,
            stock: p.stock,
            inStock: p.inStock,
            isLiked: userId ? (p.likes?.length > 0) : false,
            isSaved: userId ? (p.saves?.length > 0) : false,
        },
    }));

    // Serialize demands
    const demands = rawDemands.map((d: any) => ({
        type: 'demand' as const,
        createdAt: d.createdAt.toISOString(),
        data: {
            id: d.id,
            username: d.user.username ?? undefined,
            user: d.user.displayName,
            initials: (d.user.displayName || d.user.username || '??').substring(0, 2).toUpperCase(),
            avatarUrl: d.user.avatarUrl ?? null,
            timeAgo: new Date(d.createdAt).toLocaleDateString(),
            text: d.text || '',
            budget: `₦${Number(d.budget).toLocaleString()}`,
            budgetMin: d.budgetMin ? `₦${Number(d.budgetMin).toLocaleString()}` : null,
            bids: d._count.bids,
            commentCount: d._count.comments,
            likeCount: d._count.likes,
            viewCount: d.viewCount,
            isLiked: userId ? (d.likes?.length > 0) : false,
            isSaved: userId ? (d.saves?.length > 0) : false,
            location: d.location ?? null,
            images: d.images.map((img: { url: string }) => img.url),
        },
    }));

    // Interleave
    const items = [];
    const maxLen = Math.max(products.length, demands.length);
    for (let i = 0; i < maxLen; i++) {
        if (demands[i]) items.push(demands[i]);
        if (products[i]) items.push(products[i]);
    }

    const nextProductCursor = rawProducts.length === take
        ? rawProducts[rawProducts.length - 1].createdAt.toISOString()
        : null;
    const nextDemandCursor = rawDemands.length === take
        ? rawDemands[rawDemands.length - 1].createdAt.toISOString()
        : null;

    return NextResponse.json({
        items,
        nextProductCursor,
        nextDemandCursor,
        hasMore: nextProductCursor !== null || nextDemandCursor !== null,
    });
}
