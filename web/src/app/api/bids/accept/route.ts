import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { NotificationType } from '@prisma/client';

const acceptBidSchema = z.object({
    demandId: z.string().uuid(),
    bidId: z.string().uuid(),
});

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const parsed = acceptBidSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ message: 'Invalid format', errors: parsed.error.format() }, { status: 400 });
        }

        const { demandId, bidId } = parsed.data;

        // Verify the demand belongs to the user and is still active
        const demand = await prisma.demand.findUnique({
            where: { id: demandId }
        });

        if (!demand) return NextResponse.json({ message: 'Demand not found' }, { status: 404 });
        if (demand.userId !== session.user.id) return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
        if (!demand.isActive) return NextResponse.json({ message: 'Demand is already closed' }, { status: 400 });

        // Verify the bid belongs to this demand
        const bid = await prisma.bid.findFirst({
            where: { id: bidId, demandId: demandId },
            include: { store: true }
        });

        if (!bid) return NextResponse.json({ message: 'Bid not found on this demand' }, { status: 404 });

        // Atomic update to accept the bid, close the demand, and notify the vendor
        const [, updatedDemand] = await prisma.$transaction([
            prisma.bid.update({
                where: { id: bidId },
                data: { isAccepted: true }
            }),
            prisma.demand.update({
                where: { id: demandId },
                data: { isActive: false }
            }),
            prisma.notification.create({
                data: {
                    userId: bid.store.ownerId,
                    type: NotificationType.BID_ACCEPTED,
                    title: 'Your Bid Was Accepted!',
                    body: `Your bid of ₦${Number(bid.amount).toLocaleString()} was accepted.`,
                    link: `/requests/${demandId}`
                }
            })
        ]);

        // Note: Future Phase 3 work will instantiate an Order here natively

        return NextResponse.json({ message: 'Bid successfully accepted', demand: updatedDemand }, { status: 200 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error('Accept Bid Error:', error);
        return NextResponse.json({ message: 'Internal server error while accepting bid' }, { status: 500 });
    }
}
