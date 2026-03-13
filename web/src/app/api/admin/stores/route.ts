import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    const check = requireAdmin(session, 'ADMIN');
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

    const q = req.nextUrl.searchParams.get('q') ?? '';
    const page = Math.max(1, Number(req.nextUrl.searchParams.get('page') ?? '1'));
    const pageSize = 20;

    const where = q
        ? { OR: [
            { name: { contains: q, mode: 'insensitive' as const } },
            { owner: { displayName: { contains: q, mode: 'insensitive' as const } } },
          ] }
        : {};

    const [stores, total] = await Promise.all([
        prisma.store.findMany({
            where,
            skip: (page - 1) * pageSize,
            take: pageSize,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true, name: true, slug: true, logoUrl: true,
                verificationStatus: true, isActive: true, depCount: true,
                depTier: true, rating: true, reviewCount: true, createdAt: true,
                owner: { select: { id: true, displayName: true, email: true } },
                _count: { select: { products: true, ordersAsSeller: true } },
            },
        }),
        prisma.store.count({ where }),
    ]);

    const [salesAggs] = await Promise.all([
        Promise.all(stores.map(s =>
            prisma.order.aggregate({
                _sum: { totalAmount: true },
                where: { sellerId: s.id, status: 'COMPLETED' },
            }).then(r => ({ storeId: s.id, total: Number(r._sum.totalAmount ?? 0) }))
        )),
    ]);

    const salesMap = Object.fromEntries(salesAggs.map(s => [s.storeId, s.total]));

    return NextResponse.json({
        stores: stores.map(s => ({
            ...s,
            totalSales: salesMap[s.id] ?? 0,
            createdAt: s.createdAt.toISOString(),
        })),
        total, page, pageSize,
    });
}
