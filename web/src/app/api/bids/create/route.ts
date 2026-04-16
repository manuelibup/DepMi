import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { NotificationType } from '@prisma/client';
import { sendPushToUser } from '@/lib/webpush';

const bidSchema = z.object({
    demandId: z.string().uuid(),
    storeId: z.string().uuid(),
    amount: z.number().min(100),
    proposal: z.string().optional(),
    productId: z.string().uuid().optional(),
    images: z.array(z.string().url()).max(4).optional(),
    videoUrl: z.string().url().optional(),
});

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const parsed = bidSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ message: 'Invalid format', errors: parsed.error.format() }, { status: 400 });
        }

        const { demandId, storeId, amount, proposal, productId, images, videoUrl } = parsed.data;

        // Verify the store belongs to the user
        const store = await prisma.store.findUnique({
            where: { id: storeId, ownerId: session.user.id }
        });

        if (!store) {
            return NextResponse.json({ message: 'Store not found or unauthorized' }, { status: 403 });
        }

        // Fetch demand to get demand owner
        const demand = await prisma.demand.findUnique({
            where: { id: demandId }
        });

        if (!demand) {
            return NextResponse.json({ message: 'Demand not found' }, { status: 404 });
        }
        if (!demand.isActive) {
            return NextResponse.json({ message: 'This demand is closed and no longer accepting bids' }, { status: 400 });
        }

        if (demand.userId === session.user.id) {
            return NextResponse.json({ message: 'You cannot bid on your own demand' }, { status: 400 });
        }

        // Use a transaction to create the bid AND generate the notification atomically
        const [bid] = await prisma.$transaction([
            prisma.bid.create({
                data: {
                    demandId,
                    storeId,
                    amount,
                    proposal,
                    productId,
                    images: images || [],
                    videoUrl,
                }
            }),
            prisma.notification.create({
                data: {
                    userId: demand.userId,
                    type: NotificationType.BID_RECEIVED,
                    title: 'New Bid on Your Request',
                    body: `${store.name} has offered to fulfill your request for ₦${amount.toLocaleString()}`,
                    link: `/requests/${demandId}`
                }
            })
        ]);

        // Fire push notification (non-blocking)
        sendPushToUser(demand.userId, {
            title: 'New Bid on Your Request',
            body: `${store.name} offered ₦${amount.toLocaleString()} on your request`,
            url: `/requests/${demandId}`,
            tag: `bid-${demandId}`,
        }).catch(() => {});

        return NextResponse.json({ message: 'Bid successfully placed', bid }, { status: 201 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error('Bid Creation Error:', error);
        return NextResponse.json({ message: 'Internal server error while creating bid' }, { status: 500 });
    }
}
