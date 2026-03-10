/**
 * Auto-follow helper — called on every new user signup.
 * Seeds follows to @manuel, @web5manuel, and their store.
 * Runs silently; errors are logged but never thrown so they never block registration.
 */
import { prisma } from './prisma';

const DEFAULT_USERNAMES = ['web5manuel', 'manuel'];

export async function seedDefaultFollows(newUserId: string): Promise<void> {
    try {
        const targetUsers = await prisma.user.findMany({
            where: { username: { in: DEFAULT_USERNAMES } },
            select: { id: true, stores: { select: { id: true }, take: 1 } },
        });

        if (targetUsers.length === 0) return;

        const ops: Promise<unknown>[] = [];

        for (const target of targetUsers) {
            // Skip self-follow (in case this IS one of those accounts)
            if (target.id === newUserId) continue;

            // Follow the user
            ops.push(
                prisma.userFollow.upsert({
                    where: {
                        followerId_followingId: {
                            followerId: newUserId,
                            followingId: target.id,
                        },
                    },
                    create: { followerId: newUserId, followingId: target.id },
                    update: {},
                })
            );

            // Follow their store (if any)
            const store = target.stores[0];
            if (store) {
                ops.push(
                    prisma.storeFollow.upsert({
                        where: { userId_storeId: { userId: newUserId, storeId: store.id } },
                        create: { userId: newUserId, storeId: store.id },
                        update: {},
                    })
                );
            }
        }

        await Promise.all(ops);
    } catch (err) {
        console.error('[auto-follow] Failed to seed default follows:', err);
    }
}
