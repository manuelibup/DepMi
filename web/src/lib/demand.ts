import { unstable_cache } from 'next/cache';
import { prisma } from './prisma';

export async function getCachedDemand(idOrSlug: string) {
    return unstable_cache(
        async (id: string) => {
            return prisma.demand.findFirst({
                where: { OR: [{ slug: id }, { id }] },
                include: {
                    user: { select: { id: true, displayName: true, username: true, avatarUrl: true } },
                    images: { orderBy: { order: 'asc' }, select: { url: true } },
                    _count: { select: { likes: true, comments: true } },
                    bids: {
                        orderBy: { createdAt: 'desc' },
                        include: {
                            store: { select: { name: true, slug: true, depCount: true, depTier: true, owner: { select: { id: true, username: true } } } },
                            product: { select: { title: true, slug: true, images: { take: 1, select: { url: true } } } },
                            replies: {
                                orderBy: { createdAt: 'asc' },
                                include: { author: { select: { displayName: true, username: true, avatarUrl: true } } }
                            }
                        }
                    },
                    comments: {
                        orderBy: { createdAt: 'desc' },
                        include: {
                            author: { select: { displayName: true, username: true, avatarUrl: true } }
                        }
                    }
                }
            });
        },
        [`demand-v1-${idOrSlug}`],
        { revalidate: 300 }
    )(idOrSlug);
}

export async function getDemandPersonalization(demandId: string, userId: string) {
    const [likes, saves] = await Promise.all([
        prisma.demandLike.findMany({ where: { userId, demandId }, select: { id: true } }),
        prisma.savedDemand.findMany({ where: { userId, demandId }, select: { id: true } }),
    ]);
    return {
        isLiked: likes.length > 0,
        isSaved: saves.length > 0
    };
}
