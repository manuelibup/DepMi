import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

const settingsSchema = z.object({
    logoUrl:               z.string().url().nullable().optional(),
    bannerUrl:             z.string().url().nullable().optional(),
    description:           z.string().max(500).nullable().optional(),
    location:              z.string().max(200).nullable().optional(),
    storeState:            z.string().max(100).nullable().optional(),
    localDeliveryFee:      z.number().min(0).nullable().optional(),
    nationwideDeliveryFee: z.number().min(0).nullable().optional(),
});

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const store = await prisma.store.findUnique({
        where: { slug },
        select: {
            id: true, ownerId: true, name: true, logoUrl: true, bannerUrl: true,
            description: true, location: true, storeState: true,
            localDeliveryFee: true, nationwideDeliveryFee: true,
        },
    });

    if (!store) return NextResponse.json({ message: 'Store not found' }, { status: 404 });
    if (store.ownerId !== session.user.id) return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });

    return NextResponse.json(store);
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

        const { slug } = await params;
        const store = await prisma.store.findUnique({
            where: { slug },
            select: { id: true, ownerId: true },
        });

        if (!store) return NextResponse.json({ message: 'Store not found' }, { status: 404 });
        if (store.ownerId !== session.user.id) return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });

        const body = await req.json();
        const parsed = settingsSchema.safeParse(body);
        if (!parsed.success) return NextResponse.json({ message: 'Invalid input', errors: parsed.error.format() }, { status: 400 });

        const updated = await prisma.store.update({
            where: { id: store.id },
            data: parsed.data,
            select: {
                logoUrl: true, bannerUrl: true, description: true, location: true,
                storeState: true, localDeliveryFee: true, nationwideDeliveryFee: true,
            },
        });

        return NextResponse.json({ message: 'Store updated', store: updated });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error('Store settings PATCH error:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
