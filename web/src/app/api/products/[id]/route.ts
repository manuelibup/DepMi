import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { notifyRestockWatchers } from '@/lib/notifyWatchers';

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
        select: { inStock: true, title: true, slug: true, store: { select: { ownerId: true, name: true } } },
    });

    if (!product) {
        return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }

    if (product.store.ownerId !== session.user.id) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, price, currency, category, categoryOther, images, imageUrl, videoUrl, inStock, isPortfolioItem, deliveryFee, isDigital, fileUrl, variants } = body;

    const wasOutOfStock = product.inStock === false;

    const updated = await prisma.product.update({
        where: { id },
        data: {
            ...(title !== undefined && { title }),
            ...(description !== undefined && { description }),
            ...(price !== undefined && { price: Number(price) }),
            ...(currency !== undefined && { currency }),
            ...(category !== undefined && { category }),
            ...(categoryOther !== undefined && { categoryOther: category === 'OTHER' ? (categoryOther || null) : null }),
            ...(videoUrl !== undefined && { videoUrl: videoUrl || null }),
            ...(inStock !== undefined && { inStock }),
            ...(isPortfolioItem !== undefined && { isPortfolioItem }),
            ...(deliveryFee !== undefined && { deliveryFee: Number(deliveryFee) }),
            ...(isDigital !== undefined && { isDigital }),
            ...(fileUrl !== undefined && { fileUrl: fileUrl || null }),
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

    // Handle variants: full replace strategy
    if (Array.isArray(variants)) {
        await prisma.productVariant.deleteMany({ where: { productId: id } });
        if (variants.length > 0) {
            await prisma.productVariant.createMany({
                data: variants.map((v: { name: string; price: number; stock: number }) => ({
                    productId: id,
                    name: v.name,
                    price: Number(v.price),
                    stock: Number(v.stock) || 1,
                })),
            });
        }
    }

    // Fire restock notifications non-blocking when inStock flips false → true
    if (inStock === true && wasOutOfStock) {
        notifyRestockWatchers({
            productId: id,
            productTitle: product.title,
            productSlug: product.slug ?? id,
            storeName: product.store.name,
        }).catch(() => {});
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
