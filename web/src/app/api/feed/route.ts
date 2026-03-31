import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const STORE_COLORS = ['#1A1D1F', '#0984E3', 'var(--primary)', '#D63031', '#6C5CE7', '#E17055'];

// Cache base feed pages (no user personalization) for 30 seconds
function getCachedFeedPage(cursor: string | null, category: string | undefined, take: number) {
    return unstable_cache(
        async () => {
            const productWhere: Record<string, unknown> = { stock: { gt: 0 } };
            const demandWhere: Record<string, unknown> = { isActive: true };

            if (category) {
                productWhere.category = category;
                demandWhere.category = category;
            }
            if (cursor) {
                productWhere.createdAt = { lt: new Date(cursor) };
                demandWhere.createdAt = { lt: new Date(cursor) };
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
                slug: p.slug ?? null,
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
                videoUrl: p.videoUrl ?? null,
                viewers: p.viewCount,
                ownerId: p.store.ownerId,
                ownerUsername: p.store.owner.username,
                likeCount: p._count.likes,
                saveCount: p._count.saves,
                commentCount: p._count.comments,
                stock: p.stock,
                inStock: p.inStock,
                isDigital: p.isDigital ?? false,
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

            // Merge both lists and sort chronologically (newest first), then page
            const productItems = products.map((p: typeof products[0]) => ({ type: 'product' as const, createdAt: p.createdAt, data: p }));
            const demandItems = demands.map((d: typeof demands[0]) => ({ type: 'demand' as const, createdAt: d.createdAt, data: d }));
            const merged = [...productItems, ...demandItems]
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, take);

            const nextCursor = merged.length === take ? merged[merged.length - 1].createdAt : null;

            return { items: merged, nextCursor };
        },
        [`feed-v2-${cursor}-${category ?? 'all'}-${take}`],
        { revalidate: 30 }
    )();
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get('cursor');
    const category = searchParams.get('category') || undefined;
    const take = Math.min(Number(searchParams.get('take') || '10'), 20);

    const session = await getServerSession(authOptions);
    const userId = session?.user?.id ?? null;

    const { items, nextCursor } = await getCachedFeedPage(cursor, category, take);

    // Fetch user personalization — lightweight ID lookups only
    const likedProductIds = new Set<string>();
    const savedProductIds = new Set<string>();
    const likedDemandIds = new Set<string>();
    const savedDemandIds = new Set<string>();

    if (userId && items.length > 0) {
        const productIds = items.filter(i => i.type === 'product').map(i => i.data.id);
        const demandIds = items.filter(i => i.type === 'demand').map(i => i.data.id);

        const [pLikes, pSaves, dLikes, dSaves] = await Promise.all([
            productIds.length ? prisma.productLike.findMany({ where: { userId, productId: { in: productIds } }, select: { productId: true } }) : [],
            productIds.length ? prisma.savedProduct.findMany({ where: { userId, productId: { in: productIds } }, select: { productId: true } }) : [],
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            demandIds.length ? (prisma.demandLike as any).findMany({ where: { userId, demandId: { in: demandIds } }, select: { demandId: true } }) : [],
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            demandIds.length ? (prisma.savedDemand as any).findMany({ where: { userId, demandId: { in: demandIds } }, select: { demandId: true } }) : [],
        ]);

        pLikes.forEach((l: { productId: string }) => likedProductIds.add(l.productId));
        pSaves.forEach((s: { productId: string }) => savedProductIds.add(s.productId));
        dLikes.forEach((l: { demandId: string }) => likedDemandIds.add(l.demandId));
        dSaves.forEach((s: { demandId: string }) => savedDemandIds.add(s.demandId));
    }

    // Merge personalization
    const personalizedItems = items.map(item => ({
        ...item,
        data: item.type === 'product'
            ? { ...item.data, isLiked: likedProductIds.has(item.data.id), isSaved: savedProductIds.has(item.data.id) }
            : { ...item.data, isLiked: likedDemandIds.has(item.data.id), isSaved: savedDemandIds.has(item.data.id) },
    }));

    const cacheHeader = userId
        ? 'private, max-age=15'
        : 'public, s-maxage=30, stale-while-revalidate=60';

    return NextResponse.json({
        items: personalizedItems,
        nextCursor,
        hasMore: nextCursor !== null,
    }, {
        headers: { 'Cache-Control': cacheHeader },
    });
}
