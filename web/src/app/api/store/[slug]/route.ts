import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// PATCH /api/store/[slug] — general store profile update (logo, banner, description, location)
// Accepts both slug and UUID as the [slug] param (StoreSettingsForm sends store.id)
export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

        const { slug } = await params;

        // Find by slug first, fall back to ID
        const store = await prisma.store.findFirst({
            where: { OR: [{ slug }, { id: slug }] },
            select: { id: true, ownerId: true },
        });

        if (!store) return NextResponse.json({ message: 'Store not found' }, { status: 404 });
        if (store.ownerId !== session.user.id) return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });

        const body = await req.json();

        // Only allow safe fields — never name/slug
        const { logoUrl, bannerUrl, description, location } = body;
        const data: Record<string, string | null> = {};
        if (logoUrl !== undefined) data.logoUrl = logoUrl || null;
        if (bannerUrl !== undefined) data.bannerUrl = bannerUrl || null;
        if (description !== undefined) data.description = description?.trim() || null;
        if (location !== undefined) data.location = location?.trim() || null;

        const updated = await prisma.store.update({
            where: { id: store.id },
            data,
            select: { slug: true, logoUrl: true, bannerUrl: true, description: true, location: true },
        });

        return NextResponse.json({ message: 'Store updated', store: updated });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error('Store PATCH error:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
