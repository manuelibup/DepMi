import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { notifyRestockWatchers } from '@/lib/notifyWatchers';

export async function POST(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const product = await prisma.product.findUnique({
        where: { id },
        include: { store: { select: { ownerId: true, name: true } } },
    });

    if (!product) return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    if (product.store.ownerId !== session.user.id) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    if (product.inStock) {
        return NextResponse.json({ message: 'Product is already in stock' }, { status: 400 });
    }

    await prisma.product.update({
        where: { id },
        data: { inStock: true },
    });

    // Fire-and-forget — don't block the vendor's response
    if (product.slug) {
        notifyRestockWatchers({
            productId: id,
            productTitle: product.title,
            productSlug: product.slug,
            storeName: product.store.name,
        }).catch((err) => console.error('notifyRestockWatchers error:', err));
    }

    return NextResponse.json({ message: 'Product restocked and watchers notified' });
}
