import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

const verificationSchema = z.object({
    cacDocUrl: z.string().url('Upload a valid CAC document'),
    rcNumber:  z.string().min(2, 'RC number is required').max(20),
    location:  z.string().min(5, 'Physical address is required').max(300),
    tin:       z.string().max(20).optional(),
});

// GET — return current verification status
export async function GET(
    _req: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { slug } = await params;
    const store = await prisma.store.findUnique({
        where: { slug },
        select: { ownerId: true, verificationStatus: true, cacDocUrl: true, rcNumber: true, tin: true, location: true },
    });

    if (!store) return NextResponse.json({ message: 'Store not found' }, { status: 404 });
    if (store.ownerId !== session.user.id) return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });

    return NextResponse.json(store);
}

// POST — submit verification docs
export async function POST(
    req: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

        const { slug } = await params;
        const store = await prisma.store.findUnique({
            where: { slug },
            select: { id: true, ownerId: true, verificationStatus: true },
        });

        if (!store) return NextResponse.json({ message: 'Store not found' }, { status: 404 });
        if (store.ownerId !== session.user.id) return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
        if (store.verificationStatus === 'VERIFIED') {
            return NextResponse.json({ message: 'Store is already verified' }, { status: 400 });
        }

        const body = await req.json();
        const parsed = verificationSchema.safeParse(body);
        if (!parsed.success) return NextResponse.json({ message: 'Invalid input', errors: parsed.error.format() }, { status: 400 });

        const { cacDocUrl, rcNumber, location, tin } = parsed.data;

        await prisma.store.update({
            where: { id: store.id },
            data: {
                cacDocUrl,
                rcNumber,
                location,
                tin: tin ?? null,
                verificationStatus: 'PENDING',
            },
        });

        return NextResponse.json({ message: 'Verification submitted. Our team will review within 1–3 business days.' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error('Verification submit error:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
