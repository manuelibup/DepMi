import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { Category } from '@prisma/client';
import { createProductFromBot } from '@/lib/bot/shared';

// ─── GET: Validate and return token data ─────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
    const tokenId = new URL(req.url).searchParams.get('token');
    if (!tokenId) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

    const token = await prisma.botImportToken.findUnique({ where: { id: tokenId } });

    if (!token) return NextResponse.json({ error: 'Invalid token' }, { status: 404 });
    if (token.used) return NextResponse.json({ error: 'This link has already been used' }, { status: 410 });
    if (token.expiresAt < new Date()) return NextResponse.json({ error: 'This link has expired' }, { status: 410 });

    return NextResponse.json({
        tokenId: token.id,
        platform: token.platform,
        parsedData: token.parsedData,
        imageUrls: token.imageUrls,
    });
}

// ─── POST: Confirm and create the product ────────────────────────────────────

const confirmSchema = z.object({
    tokenId: z.string().min(1),
    storeId: z.string().min(1),
    title: z.string().min(3).max(100),
    description: z.string().max(1000).optional(),
    price: z.number().min(0),
    category: z.nativeEnum(Category),
    stock: z.number().int().min(0).default(1),
    deliveryFee: z.number().min(0).nullable().optional(),
    imageUrls: z.array(z.string()).min(1),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const parsed = confirmSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid request', errors: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { tokenId, storeId, title, description, price, category, stock, deliveryFee, imageUrls } = parsed.data;

    // Re-validate the token
    const token = await prisma.botImportToken.findUnique({ where: { id: tokenId } });

    if (!token) return NextResponse.json({ error: 'Invalid token' }, { status: 404 });
    if (token.used) return NextResponse.json({ error: 'This link has already been used' }, { status: 410 });
    if (token.expiresAt < new Date()) return NextResponse.json({ error: 'This link has expired' }, { status: 410 });

    // Verify the authenticated user owns the selected store
    const store = await prisma.store.findUnique({
        where: { id: storeId },
        select: { id: true, slug: true, ownerId: true },
    });

    if (!store || store.ownerId !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Mark token used before creating (prevent double-submit)
    await prisma.botImportToken.update({
        where: { id: tokenId },
        data: { used: true },
    });

    try {
        const result = await createProductFromBot({
            storeId: store.id,
            title,
            description,
            price,
            category,
            images: imageUrls,
            stock,
            deliveryFee: deliveryFee ?? null,
        });

        return NextResponse.json({
            message: 'Product created successfully',
            product: result.product,
            storeSlug: result.storeSlug,
            slug: result.slug,
        }, { status: 201 });
    } catch (err) {
        console.error('[bot/import] Product creation error:', err);
        // Revert token used flag so the vendor can try again
        await prisma.botImportToken.update({
            where: { id: tokenId },
            data: { used: false },
        });
        return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
    }
}
