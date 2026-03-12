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
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id: demandId } = await params;
    const userId = session.user.id;

    try {
        const existing = await prisma.demandLike.findUnique({
            where: { userId_demandId: { userId, demandId } },
        });

        if (existing) {
            await prisma.demandLike.delete({ where: { id: existing.id } });
            return NextResponse.json({ liked: false });
        } else {
            await prisma.demandLike.create({ data: { userId, demandId } });
            return NextResponse.json({ liked: true });
        }
    } catch (err) {
        console.error('[demand like]', err);
        return NextResponse.json({ message: 'Error' }, { status: 500 });
    }
}
