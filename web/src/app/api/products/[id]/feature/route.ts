import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const product = await prisma.product.findUnique({
        where: { id },
        select: { isFeatured: true, store: { select: { ownerId: true } } },
    });

    if (!product) {
        return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }

    if (product.store.ownerId !== session.user.id) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const updated = await prisma.product.update({
        where: { id },
        data: { isFeatured: !product.isFeatured },
        select: { id: true, isFeatured: true },
    });

    return NextResponse.json(updated);
}
