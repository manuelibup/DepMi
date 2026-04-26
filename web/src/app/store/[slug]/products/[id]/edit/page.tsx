import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { notFound, redirect } from 'next/navigation';
import EditProductForm from './EditProductForm';

interface EditProductPageProps {
    params: Promise<{ slug: string; id: string }>;
}

export default async function EditProductPage({ params }: EditProductPageProps) {
    const { slug, id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) redirect('/login');

    const store = await prisma.store.findUnique({
        where: { slug },
        select: { id: true, ownerId: true, slug: true },
    });

    if (!store) notFound();
    if (store.ownerId !== session.user.id) redirect('/');

    const product = await prisma.product.findUnique({
        where: { id, storeId: store.id },
        include: {
            images: { orderBy: { order: 'asc' } },
            variants: { orderBy: { createdAt: 'asc' } },
        },
    });

    if (!product) notFound();

    const serialized = {
        id: product.id,
        title: product.title,
        description: product.description ?? '',
        price: Number(product.price),
        currency: product.currency,
        category: product.category as string,
        categoryOther: product.categoryOther ?? null,
        imageUrl: product.images[0]?.url ?? '',
        imageUrls: product.images.map(img => img.url),
        videoUrl: product.videoUrl ?? '',
        inStock: product.inStock,
        isPortfolioItem: product.isPortfolioItem,
        deliveryFee: Number(product.deliveryFee),
        isDigital: product.isDigital,
        fileUrl: product.fileUrl ?? null,
        variants: product.variants.map(v => ({
            id: v.id,
            name: v.name,
            price: String(Number(v.price)),
            stock: String(v.stock),
        })),
    };

    return (
        <main style={{ maxWidth: '480px', margin: '0 auto', minHeight: '100dvh', backgroundColor: 'var(--bg-color)', display: 'flex', flexDirection: 'column' }}>
            <EditProductForm product={serialized} storeSlug={store.slug} />
        </main>
    );
}
