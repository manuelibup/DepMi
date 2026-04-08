import { unstable_cache } from 'next/cache';
import { prisma } from './prisma';

export async function getCachedProduct(idOrSlug: string) {
    return unstable_cache(
        async (id: string) => {
            return prisma.product.findFirst({
                where: { OR: [{ slug: id }, { id }] },
                include: {
                    images: { orderBy: { order: 'asc' } },
                    store: {
                        select: { 
                            id: true, 
                            name: true, 
                            slug: true, 
                            logoUrl: true, 
                            depCount: true, 
                            depTier: true, 
                            ownerId: true, 
                            rating: true, 
                            reviewCount: true, 
                            dispatchEnabled: true, 
                            pickupAddress: true 
                        }
                    },
                    comments: {
                        include: { author: { select: { displayName: true, username: true, avatarUrl: true } } },
                        orderBy: { createdAt: 'asc' }
                    },
                    variants: { orderBy: { price: 'asc' } },
                }
            });
        },
        [`product-v1-${idOrSlug}`],
        { revalidate: 300 } // Cache for 5 minutes
    )(idOrSlug);
}

export async function getCachedRecommendations(category: string, excludeStoreId: string) {
    return unstable_cache(
        async (cat: string, storeId: string) => {
            return prisma.product.findMany({
                where: {
                    category: cat as any,
                    storeId: { not: storeId },
                    inStock: true,
                    isPortfolioItem: false,
                },
                select: {
                    id: true,
                    slug: true,
                    title: true,
                    price: true,
                    currency: true,
                    images: { orderBy: { order: 'asc' }, take: 1, select: { url: true } },
                    store: { select: { name: true } },
                },
                orderBy: { viewCount: 'desc' },
                take: 6,
            });
        },
        [`product-recos-${category}-${excludeStoreId}`],
        { revalidate: 600 } // Cache for 10 minutes
    )(category, excludeStoreId);
}
