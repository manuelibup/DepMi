import { unstable_cache } from 'next/cache';
import { prisma } from './prisma';

export async function getCachedHandle(handle: string) {
    return unstable_cache(
        async (h: string) => {
            // Check user first
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const user = await (prisma.user as any).findFirst({
                where: { username: { equals: h, mode: 'insensitive' } },
                select: { 
                    id: true,
                    displayName: true, 
                    username: true, 
                    bio: true, 
                    avatarUrl: true 
                },
            });
            if (user) return { type: 'user' as const, data: user };

            // Check store
            const store = await prisma.store.findFirst({
                where: { slug: { equals: h, mode: 'insensitive' } },
                select: { 
                    id: true,
                    name: true, 
                    description: true, 
                    logoUrl: true, 
                    location: true, 
                    depCount: true, 
                    slug: true 
                },
            });
            if (store) return { type: 'store' as const, data: store };

            return null;
        },
        [`handle-resolver-${handle.toLowerCase()}`],
        { revalidate: 3600 } // Cache for 1 hour
    )(handle);
}
