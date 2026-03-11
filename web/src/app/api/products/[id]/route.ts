import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    const product = await prisma.product.findUnique({
        where: { id },
        include: { images: { orderBy: { order: 'asc' } } },
    });

    if (!product) {
        return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(product);
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const product = await prisma.product.findUnique({
        where: { id },
        include: { store: { select: { ownerId: true } } },
    });

    if (!product) {
        return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }

    if (product.store.ownerId !== session.user.id) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, price, currency, category, images, imageUrl, videoUrl, inStock, isPortfolioItem } = body;

    const updated = await prisma.product.update({
        where: { id },
        data: {
            ...(title !== undefined && { title }),
            ...(description !== undefined && { description }),
            ...(price !== undefined && { price: Number(price) }),
            ...(currency !== undefined && { currency }),
            ...(category !== undefined && { category }),
            ...(videoUrl !== undefined && { videoUrl: videoUrl || null }),
            ...(inStock !== undefined && { inStock }),
            ...(isPortfolioItem !== undefined && { isPortfolioItem }),
        },
    });

    // Accept `images: string[]` (new multi-image) or legacy `imageUrl: string`
    const imageList: string[] = Array.isArray(images)
        ? images
        : imageUrl !== undefined
            ? (imageUrl ? [imageUrl] : [])
            : [];

    if (Array.isArray(images) || imageUrl !== undefined) {
        await prisma.productImage.deleteMany({ where: { productId: id } });
        if (imageList.length > 0) {
            await prisma.productImage.createMany({
                data: imageList.map((url: string, order: number) => ({ productId: id, url, order })),
            });
        }
    }

    return NextResponse.json({ product: updated });
}

export async function DELETE(
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
        include: { store: { select: { ownerId: true } } },
    });

    if (!product) {
        return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }

    if (product.store.ownerId !== session.user.id) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    await prisma.product.delete({ where: { id } });

    return NextResponse.json({ message: 'Product deleted' });
}
