import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { Category } from '@prisma/client';
import { generateProductSlug } from '@/lib/slugify';
import { notifySearchWatchers } from '@/lib/notifyWatchers';

const productSchema = z.object({
    storeId: z.string().min(1, "Store ID is required"),
    title: z.string().min(3, "Title must be at least 3 characters").max(100),
    description: z.string().optional(),
    price: z.number().min(1, "Price must be at least 1"),
    currency: z.string().default("₦"),
    category: z.nativeEnum(Category),
    videoUrl: z.string().url().nullable().optional(),
    stock: z.number().int().min(1, "Stock must be at least 1").default(1),
    deliveryFee: z.number().min(0, "Delivery fee cannot be negative").default(2500),
    images: z.array(z.string()).optional(),
    isDigital: z.boolean().default(false),
    fileUrl: z.string().nullable().optional(),
});

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const parsed = productSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { message: 'Invalid product details.', errors: parsed.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const { storeId, title, description, price, currency, category, images, videoUrl, stock, deliveryFee, isDigital, fileUrl } = parsed.data;

        // Verify ownership
        const store = await prisma.store.findUnique({
            where: { id: storeId },
            select: { ownerId: true, name: true }
        });

        if (!store) {
            return NextResponse.json({ message: 'Store not found.' }, { status: 404 });
        }

        if (store.ownerId !== session.user.id) {
            return NextResponse.json({ message: 'Forbidden. You do not own this store.' }, { status: 403 });
        }

        // Generate a unique slug from title + store name
        const slug = await generateProductSlug(title, store.name, (s) =>
            prisma.product.findUnique({ where: { slug: s }, select: { id: true } })
        );

        // Create the product atomically with its images using Prisma nested writes
        const product = await prisma.product.create({
            data: {
                storeId,
                title,
                slug,
                description,
                price,
                currency,
                category,
                // inStock was removed from schema, so it's not passed here
                stock,
                deliveryFee: isDigital ? 0 : deliveryFee,
                isDigital,
                fileUrl: fileUrl || null,
                videoUrl: videoUrl || null,
                images: images && images.length > 0 ? {
                    create: images.map((url, index) => ({
                        url,
                        order: index
                    }))
                } : undefined
            },
            include: {
                images: true
            }
        });

        // Fetch active followers who want notifications
        const followers = await prisma.storeFollow.findMany({
            where: {
                storeId,
                notify: true
            },
            select: { userId: true }
        });

        // Broadcast notifications generically
        if (followers.length > 0) {
            await prisma.notification.createMany({
                data: followers.map(f => ({
                    userId: f.userId,
                    type: 'NEW_PRODUCT_FROM_STORE',
                    title: `New drop from ${store.name}`,
                    body: `${title} is now available for ${currency}${price.toLocaleString()}`,
                    link: `/p/${slug}`,
                    isRead: false
                }))
            });
        }

        // Notify users whose search-query watches match this product title (fire-and-forget)
        if (slug) {
            notifySearchWatchers({
                productId: product.id,
                productTitle: title,
                productSlug: slug,
                storeName: store.name,
                price,
                currency,
            }).catch((err) => console.error('notifySearchWatchers error:', err));
        }

        return NextResponse.json({ message: 'Product successfully created', product }, { status: 201 });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error('Product Creation Error:', error);
        return NextResponse.json(
            { message: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
