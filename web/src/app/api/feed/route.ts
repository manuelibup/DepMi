import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const STORE_COLORS = ['#1A1D1F', '#0984E3', '#00B894', '#D63031', '#6C5CE7', '#E17055'];

// Cache base feed pages (no user personalization) for 30 seconds
function getCachedFeedPage(productCursor: string | null, demandCursor: string | null, category: string | undefined, take: number) {
    return unstable_cache(
        async () => {
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

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const [rawProducts, rawDemands] = await Promise.all([
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (prisma.product as any).findMany({
                    where: productWhere,
                    orderBy: { createdAt: 'desc' },
                    take,
                    include: {
                        store: { select: { name: true, slug: true, logoUrl: true, depCount: true, depTier: true, id: true, ownerId: true, owner: { select: { username: true } } } },
                        images: true,
                        _count: { select: { likes: true, saves: true, comments: true } },
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
                    },
                }),
            ]);

            // Serialize to plain JSON
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const products = rawProducts.map((p: any) => ({
                id: p.id,
                createdAt: p.createdAt.toISOString(),
                type: 'product' as const,
                store: p.store.name,
                storeSlug: p.store.slug,
                storeInitial: p.store.name.charAt(0).toUpperCase(),
                storeColor: STORE_COLORS[p.store.name.length % STORE_COLORS.length],
                logoUrl: p.store.logoUrl ?? null,
                deps: p.store.depCount,
                depTier: p.store.depTier.toLowerCase(),
                title: p.title,
                price: `₦${Number(p.price).toLocaleString()}`,
                location: 'Nationwide',
                image: p.images?.[0]?.url ?? '',
                images: (p.images ?? []).map((img: { url: string }) => img.url),
                viewers: p.viewCount,
                ownerId: p.store.ownerId,
                ownerUsername: p.store.owner.username,
                likeCount: p._count.likes,
                saveCount: p._count.saves,
                commentCount: p._count.comments,
                stock: p.stock,
                inStock: p.inStock,
            }));

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const demands = rawDemands.map((d: any) => ({
                id: d.id,
                createdAt: d.createdAt.toISOString(),
                type: 'demand' as const,
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
                location: d.location ?? null,
                images: d.images.map((img: { url: string }) => img.url),
            }));

            const nextProductCursor = rawProducts.length === take
                ? rawProducts[rawProducts.length - 1].createdAt.toISOString()
                : null;
            const nextDemandCursor = rawDemands.length === take
                ? rawDemands[rawDemands.length - 1].createdAt.toISOString()
                : null;

            return { products, demands, nextProductCursor, nextDemandCursor };
        },
        [`feed-${productCursor}-${demandCursor}-${category ?? 'all'}-${take}`],
        { revalidate: 30 }
    )();
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const productCursor = searchParams.get('productCursor');
    const demandCursor = searchParams.get('demandCursor');
    const category = searchParams.get('category') || undefined;
    const take = Math.min(Number(searchParams.get('take') || '10'), 20);

    const session = await getServerSession(authOptions);
    const userId = session?.user?.id ?? null;

    const { products, demands, nextProductCursor, nextDemandCursor } =
        await getCachedFeedPage(productCursor, demandCursor, category, take);

    // Fetch user personalization — lightweight ID lookups only
    const likedProductIds = new Set<string>();
    const savedProductIds = new Set<string>();
    const likedDemandIds = new Set<string>();
    const savedDemandIds = new Set<string>();

    if (userId && (products.length > 0 || demands.length > 0)) {
        const productIds = products.map(p => p.id);
        const demandIds = demands.map(d => d.id);

        const [pLikes, pSaves, dLikes, dSaves] = await Promise.all([
            prisma.productLike.findMany({ where: { userId, productId: { in: productIds } }, select: { productId: true } }),
            prisma.savedProduct.findMany({ where: { userId, productId: { in: productIds } }, select: { productId: true } }),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (prisma.demandLike as any).findMany({ where: { userId, demandId: { in: demandIds } }, select: { demandId: true } }),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (prisma.savedDemand as any).findMany({ where: { userId, demandId: { in: demandIds } }, select: { demandId: true } }),
        ]);

        pLikes.forEach((l: { productId: string }) => likedProductIds.add(l.productId));
        pSaves.forEach((s: { productId: string }) => savedProductIds.add(s.productId));
        dLikes.forEach((l: { demandId: string }) => likedDemandIds.add(l.demandId));
        dSaves.forEach((s: { demandId: string }) => savedDemandIds.add(s.demandId));
    }

    // Merge personalization and build feed items
    const productItems = products.map(p => ({
        type: 'product' as const,
        createdAt: p.createdAt,
        data: { ...p, isLiked: likedProductIds.has(p.id), isSaved: savedProductIds.has(p.id) },
    }));

    const demandItems = demands.map(d => ({
        type: 'demand' as const,
        createdAt: d.createdAt,
        data: { ...d, isLiked: likedDemandIds.has(d.id), isSaved: savedDemandIds.has(d.id) },
    }));

    // Interleave
    const items = [];
    const maxLen = Math.max(productItems.length, demandItems.length);
    for (let i = 0; i < maxLen; i++) {
        if (demandItems[i]) items.push(demandItems[i]);
        if (productItems[i]) items.push(productItems[i]);
    }

    const cacheHeader = userId
        ? 'private, max-age=15'
        : 'public, s-maxage=30, stale-while-revalidate=60';

    return NextResponse.json({
        items,
        nextProductCursor,
        nextDemandCursor,
        hasMore: nextProductCursor !== null || nextDemandCursor !== null,
    }, {
        headers: { 'Cache-Control': cacheHeader },
    });
}
