import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || '';
    
    if (q.length < 2) {
        return NextResponse.json([]);
    }

    try {
        const users = await prisma.user.findMany({
            where: {
                OR: [
                    { username: { startsWith: q, mode: 'insensitive' } },
                    { displayName: { contains: q, mode: 'insensitive' } },
                ]
            },
            take: 5,
            select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
            }
        });

        const stores = await prisma.store.findMany({
            where: {
                OR: [
                    { slug: { startsWith: q, mode: 'insensitive' } },
                    { name: { contains: q, mode: 'insensitive' } },
                ]
            },
            take: 3,
            select: {
                id: true,
                slug: true,
                name: true,
                logoUrl: true,
            }
        });

        const mixedResults = [
            ...users.map(u => ({ ...u, type: 'user' as const })),
            ...stores.map(s => ({
                id: s.id,
                username: s.slug,
                displayName: s.name,
                avatarUrl: s.logoUrl,
                type: 'store' as const
            }))
        ];

        return NextResponse.json(mixedResults.slice(0, 8));
    } catch (error) {
        console.error('User search error:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
