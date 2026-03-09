import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

const transferSchema = z.object({
    username: z.string().min(1, 'Username is required'),
});

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
            select: { id: true, ownerId: true, name: true },
        });

        if (!store) return NextResponse.json({ message: 'Store not found' }, { status: 404 });
        if (store.ownerId !== session.user.id) return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });

        const body = await req.json();
        const parsed = transferSchema.safeParse(body);
        if (!parsed.success) return NextResponse.json({ message: 'Invalid input' }, { status: 400 });

        const { username } = parsed.data;

        // Find the recipient
        const recipient = await prisma.user.findUnique({
            where: { username },
            select: { id: true, username: true, displayName: true, kycTier: true },
        });

        if (!recipient) return NextResponse.json({ message: `No user found with username @${username}` }, { status: 404 });
        if (recipient.id === session.user.id) return NextResponse.json({ message: 'You already own this store' }, { status: 400 });

        // Recipient must be BVN-verified (TIER_2+) to own a store (Relaxed for Pilot Phase)
        // const eligibleTiers = ['TIER_2', 'TIER_3', 'BUSINESS'];
        // if (!eligibleTiers.includes(recipient.kycTier)) {
        //     return NextResponse.json({
        //         message: `@${username} is not eligible to receive store ownership. They must be BVN-verified (KYC Tier 2+).`
        //     }, { status: 400 });
        // }

        await prisma.store.update({
            where: { id: store.id },
            data: { ownerId: recipient.id },
        });

        return NextResponse.json({
            message: `${store.name} has been transferred to @${recipient.username}`,
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error('Store transfer error:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
