import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const [users, stores, listings] = await Promise.all([
            prisma.user.count(),
            prisma.store.count({ where: { isActive: true } }),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (prisma.product as any).count({ where: { stock: { gt: 0 } } }),
        ]);
        return NextResponse.json({ users, stores, listings });
    } catch {
        return NextResponse.json({ users: 0, stores: 0, listings: 0 });
    }
}
