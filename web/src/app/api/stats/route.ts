import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { unstable_cache } from 'next/cache';

// Cache platform stats for 5 minutes — counts change slowly
const getCachedStats = unstable_cache(
    async () => {
        const [users, stores, listings] = await Promise.all([
            prisma.user.count(),
            prisma.store.count({ where: { isActive: true } }),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (prisma.product as any).count({ where: { stock: { gt: 0 } } }),
        ]);
        return { users, stores, listings };
    },
    ['platform-stats'],
    { revalidate: 300 },
);

export async function GET() {
    try {
        const stats = await getCachedStats();
        return NextResponse.json(stats);
    } catch {
        return NextResponse.json({ users: 0, stores: 0, listings: 0 });
    }
}
