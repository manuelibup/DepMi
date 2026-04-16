import { unstable_cache } from 'next/cache';
import { prisma } from './prisma';

export const STORE_COLORS = ['#1A1D1F', '#0984E3', 'var(--primary)', '#D63031', '#6C5CE7', '#E17055'];

export type FeedItem =
    | { type: 'product'; createdAt: string; data: any }
    | { type: 'demand'; createdAt: string; data: any }
    | { type: 'post'; createdAt: string; data: any };

export async function getCachedFeedPage(cursor: string | null, category: string | undefined, take: number, sort: string | undefined) {
    return unstable_cache(
        async () => {
            const productWhere: Record<string, any> = { stock: { gt: 0 } };
            const demandWhere: Record<string, any> = { isActive: true };
            const postWhere: Record<string, any> = {};

            if (category) {
                productWhere.category = category;
                demandWhere.category = category;
            }
            const page = parseInt(cursor || '1', 10);
            const offset = (page - 1) * take;

            const productOrderBy: Record<string, string>[] =
                sort === 'price_asc' ? [{ price: 'asc' }] :
                sort === 'price_desc' ? [{ price: 'desc' }] :
                [{ createdAt: 'desc' }];

            const [rawProducts, rawDemands, rawPosts] = await Promise.all([
                (prisma.product as any).findMany({
                    where: productWhere,
                    orderBy: productOrderBy,
                    skip: offset,
                    take,
                    include: {
                        store: { select: { name: true, slug: true, logoUrl: true, depCount: true, depTier: true, id: true, ownerId: true, owner: { select: { username: true } } } },
                        images: true,
                        variants: { select: { price: true }, orderBy: { price: 'asc' } },
                    },
                }),
                (prisma.demand as any).findMany({
                    where: demandWhere,
                    orderBy: { createdAt: 'desc' },
                    skip: offset,
                    take,
                    include: {
                        user: { select: { displayName: true, username: true, avatarUrl: true } },
                        images: { orderBy: { order: 'asc' }, take: 3, select: { url: true } },
                    },
                }),
                prisma.post.findMany({
                    where: postWhere,
                    orderBy: { createdAt: 'desc' },
                    skip: offset,
                    take,
                    include: {
                        store: { select: { slug: true } },
                        author: { select: { displayName: true, username: true, avatarUrl: true } },
                        images: { select: { url: true } },
                    },
                }),
            ]);

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
                price: p.variants?.length
                    ? `from ₦${Number(p.variants[0].price).toLocaleString()}`
                    : `₦${Number(p.price).toLocaleString()}`,
                location: 'Nationwide',
                image: p.images?.[0]?.url ?? '',
                images: (p.images ?? []).map((img: { url: string }) => img.url),
                videoUrl: p.videoUrl ?? null,
                viewers: p.viewCount,
                ownerId: p.store.ownerId,
                ownerUsername: p.store.owner.username,
                likeCount: p.likeCount,
                saveCount: p.saveCount,
                commentCount: p.commentCount,
                stock: p.stock,
                inStock: p.inStock,
                isDigital: p.isDigital ?? false,
            }));

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
                bids: d.bidCount,
                commentCount: d.commentCount,
                likeCount: d.likeCount,
                viewCount: d.viewCount,
                location: d.location ?? null,
                images: d.images.map((img: { url: string }) => img.url),
            }));

            const posts = rawPosts.map((p: any) => ({
                id: p.id,
                createdAt: p.createdAt.toISOString(),
                body: p.body,
                type: p.type as 'POST' | 'ANNOUNCEMENT',
                likeCount: p.likeCount,
                commentCount: p.commentCount,
                storeSlug: p.store.slug,
                author: {
                    displayName: p.author.displayName ?? null,
                    username: p.author.username ?? null,
                    avatarUrl: p.author.avatarUrl ?? null,
                },
                images: p.images.map((img: { url: string }) => ({ url: img.url })),
                isLiked: false,
            }));

            const productItems = products.map((p: any) => ({ type: 'product' as const, createdAt: p.createdAt, data: p }));
            const demandItems = demands.map((d: any) => ({ type: 'demand' as const, createdAt: d.createdAt, data: d }));
            const postItems = posts.map((p: any) => ({ type: 'post' as const, createdAt: p.createdAt, data: p }));

            const merged = sort === 'price_asc' || sort === 'price_desc'
                ? [...productItems, ...demandItems, ...postItems].slice(0, take)
                : [...productItems, ...demandItems, ...postItems]
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .slice(0, take);

            const nextCursor = merged.length === take ? String(page + 1) : null;

            return { items: merged, nextCursor };
        },
        [`feed-v4-page-${cursor || '1'}-${category ?? 'all'}-${sort ?? 'newest'}-${take}`],
        { revalidate: 60 }
    )();
}

export async function getCachedTopStores() {
    return unstable_cache(
        async () => {
            return prisma.store.findMany({
                where: { isActive: true },
                orderBy: { depCount: 'desc' },
                take: 8,
                select: { id: true, name: true, slug: true, logoUrl: true, depCount: true },
            });
        },
        ['top-stores-v1'],
        { revalidate: 300 } // Cache for 5 minutes
    )();
}

export async function personalizeItems(items: FeedItem[], userId: string | null) {
    if (!userId || items.length === 0) return items;

    // Cache the user's liked/saved IDs for 30s — prevents 5 DB queries on every infinite scroll page
    const getUserInteractions = unstable_cache(
        async () => {
            const productIds = items.filter(i => i.type === 'product').map(i => i.data.id);
            const demandIds = items.filter(i => i.type === 'demand').map(i => i.data.id);
            const postIds = items.filter(i => i.type === 'post').map(i => i.data.id);

            const [pLikes, pSaves, dLikes, dSaves, postLikes] = await Promise.all([
                productIds.length ? prisma.productLike.findMany({ where: { userId, productId: { in: productIds } }, select: { productId: true } }) : [],
                productIds.length ? prisma.savedProduct.findMany({ where: { userId, productId: { in: productIds } }, select: { productId: true } }) : [],
                demandIds.length ? (prisma.demandLike as any).findMany({ where: { userId, demandId: { in: demandIds } }, select: { demandId: true } }) : [],
                demandIds.length ? (prisma.savedDemand as any).findMany({ where: { userId, demandId: { in: demandIds } }, select: { demandId: true } }) : [],
                postIds.length ? prisma.postLike.findMany({ where: { userId, postId: { in: postIds } }, select: { postId: true } }) : [],
            ]);

            return {
                likedProductIds: pLikes.map((l: any) => l.productId),
                savedProductIds: pSaves.map((s: any) => s.productId),
                likedDemandIds: dLikes.map((l: any) => l.demandId),
                savedDemandIds: dSaves.map((s: any) => s.demandId),
                likedPostIds: postLikes.map((l: any) => l.postId),
            };
        },
        // Cache key: user + item IDs (so different page cursors still work correctly)
        [`personalize-${userId}-${items.map(i => i.data.id).join(',')}`],
        { revalidate: 30 } // 30 seconds — balances freshness with DB savings
    );

    const { likedProductIds, savedProductIds, likedDemandIds, savedDemandIds, likedPostIds } = await getUserInteractions();

    const likedProductSet = new Set(likedProductIds);
    const savedProductSet = new Set(savedProductIds);
    const likedDemandSet = new Set(likedDemandIds);
    const savedDemandSet = new Set(savedDemandIds);
    const likedPostSet = new Set(likedPostIds);

    return items.map(item => {
        if (item.type === 'product') {
            return { ...item, data: { ...item.data, isLiked: likedProductSet.has(item.data.id), isSaved: savedProductSet.has(item.data.id) } };
        }
        if (item.type === 'demand') {
            return { ...item, data: { ...item.data, isLiked: likedDemandSet.has(item.data.id), isSaved: savedDemandSet.has(item.data.id) } };
        }
        return { ...item, data: { ...item.data, isLiked: likedPostSet.has(item.data.id) } };
    });
}

