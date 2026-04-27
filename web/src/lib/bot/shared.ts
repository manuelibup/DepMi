import { prisma } from '@/lib/prisma';
import { Category } from '@prisma/client';
import { generateProductSlug } from '@/lib/slugify';
import { notifySearchWatchers } from '@/lib/notifyWatchers';

export interface BotProductInput {
    storeId: string;
    title: string;
    description?: string;
    price: number;
    category: Category;
    images: string[];         // Cloudinary URLs
    stock: number;
    deliveryFee: number | null; // null = inherit from store
    isDigital?: boolean;
    inStock?: boolean;
    videoUrl?: string | null;
    variants?: string;        // comma-separated "Name/Size" list, e.g. "Red/S, Red/M"
}

/**
 * Create a product from bot input, bypassing the session check.
 * Auth is validated upstream (phone match, OTP, or import token).
 * Mirrors the logic in api/products/create/route.ts.
 */
export async function createProductFromBot(input: BotProductInput) {
    const {
        storeId,
        title,
        description,
        price,
        category,
        images,
        stock,
        deliveryFee,
        isDigital = false,
        inStock = true,
        videoUrl = null,
        variants = '',
    } = input;

    // Parse "Red/S, Red/M, Blue/L" into variant records
    const parsedVariants = variants
        ? variants.split(',').map(v => v.trim()).filter(Boolean).map(name => ({
            name: name.substring(0, 80),
            price,
            stock: 1,
        }))
        : [];

    const store = await prisma.store.findUnique({
        where: { id: storeId },
        select: { name: true, slug: true },
    });

    if (!store) throw new Error('Store not found');

    const slug = await generateProductSlug(title, store.name, (s) =>
        prisma.product.findUnique({ where: { slug: s }, select: { id: true } })
    );

    // deliveryFee: null → Prisma undefined (inherit from store), 0 → free, N → custom
    const effectiveDeliveryFee = isDigital ? 0 : deliveryFee;

    const product = await prisma.product.create({
        data: {
            storeId,
            title,
            slug,
            description: description || null,
            price,
            currency: '₦',
            category,
            stock,
            inStock,
            deliveryFee: effectiveDeliveryFee === null ? undefined : effectiveDeliveryFee,
            isDigital,
            videoUrl: videoUrl || null,
            images: images.length > 0
                ? { create: images.map((url, i) => ({ url, order: i })) }
                : undefined,
            variants: parsedVariants.length > 0
                ? { create: parsedVariants }
                : undefined,
        },
        include: { images: true },
    });

    // Notify store followers
    const followers = await prisma.storeFollow.findMany({
        where: { storeId, notify: true },
        select: { userId: true },
    });

    if (followers.length > 0) {
        await prisma.notification.createMany({
            data: followers.map((f) => ({
                userId: f.userId,
                type: 'NEW_PRODUCT_FROM_STORE' as const,
                title: `New drop from ${store.name}`,
                body: `${title} is now available for ₦${price.toLocaleString()}`,
                link: `/p/${slug}`,
                isRead: false,
            })),
        });
    }

    if (slug) {
        notifySearchWatchers({
            productId: product.id,
            productTitle: title,
            productSlug: slug,
            storeName: store.name,
            price,
            currency: '₦',
        }).catch((err) => console.error('[bot/shared] notifySearchWatchers error:', err));
    }

    return { product, storeSlug: store.slug, slug };
}
