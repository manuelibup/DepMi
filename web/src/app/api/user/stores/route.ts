import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return NextResponse.json({ stores: [] });
    }

    const stores = await prisma.store.findMany({
        where: { ownerId: session.user.id },
        select: { id: true, slug: true, name: true },
        orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ stores });
}
