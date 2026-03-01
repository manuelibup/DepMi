import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { Category } from '@prisma/client';

const productSchema = z.object({
    storeId: z.string().min(1, 'Store ID is required'),
    title: z.string().min(3, 'Title must be at least 3 characters').max(100),
    description: z.string().max(1000).optional().nullable(),
    price: z.coerce.number().min(0, 'Price must be zero or positive'),
    category: z.nativeEnum(Category).default(Category.OTHER),
    inStock: z.boolean().default(true),
    images: z.array(z.string().url()).max(5).optional(), // Max 5 images per product
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

        const { storeId, title, description, price, category, inStock, images } = parsed.data;

        // Verify ownership
        const store = await prisma.store.findUnique({
            where: { id: storeId },
            select: { ownerId: true }
        });

        if (!store) {
            return NextResponse.json({ message: 'Store not found.' }, { status: 404 });
        }

        if (store.ownerId !== session.user.id) {
            return NextResponse.json({ message: 'Forbidden. You do not own this store.' }, { status: 403 });
        }

        // Create the product atomically with its images using Prisma nested writes
        const product = await prisma.product.create({
            data: {
                storeId,
                title,
                description: description || null,
                price,
                category,
                inStock,
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

        return NextResponse.json({ message: 'Product successfully listed.', product }, { status: 201 });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error('Product Creation Error:', error);
        return NextResponse.json(
            { message: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
