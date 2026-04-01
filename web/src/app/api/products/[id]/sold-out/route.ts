import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

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
        include: { store: { select: { ownerId: true } } },
    });

    if (!product) return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    if (product.store.ownerId !== session.user.id) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    if (!product.inStock) {
        return NextResponse.json({ message: 'Product is already sold out' }, { status: 400 });
    }

    await prisma.product.update({
        where: { id },
        data: { inStock: false, stock: 0 },
    });

    return NextResponse.json({ message: 'Product marked as sold out' });
}
