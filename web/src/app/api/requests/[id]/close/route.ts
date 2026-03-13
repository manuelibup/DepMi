import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const demand = await prisma.demand.findUnique({
            where: { id }
        });

        if (!demand) {
            return NextResponse.json({ message: 'Demand not found' }, { status: 404 });
        }

        if (demand.userId !== session.user.id) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const updatedDemand = await prisma.demand.update({
            where: { id },
            data: { isActive: false }
        });

        return NextResponse.json({ message: 'Demand successfully closed', demand: updatedDemand }, { status: 200 });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error('Close Demand Error:', error);
        return NextResponse.json(
            { message: 'Internal server error while closing demand' },
            { status: 500 }
        );
    }
}
