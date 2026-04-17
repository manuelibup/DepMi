import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: demandId } = await params;
    const userId = session.user.id;

    try {
        const existing = await prisma.savedDemand.findUnique({
            where: { userId_demandId: { userId, demandId } },
        });

        if (existing) {
            await prisma.$transaction([
                prisma.savedDemand.delete({ where: { id: existing.id } }),
                prisma.demand.update({ where: { id: demandId }, data: { saveCount: { decrement: 1 } } }),
            ]);
            return NextResponse.json({ saved: false });
        } else {
            await prisma.$transaction([
                prisma.savedDemand.create({ data: { userId, demandId } }),
                prisma.demand.update({ where: { id: demandId }, data: { saveCount: { increment: 1 } } }),
            ]);
            return NextResponse.json({ saved: true });
        }
    } catch (err) {
        console.error('[demand save]', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
