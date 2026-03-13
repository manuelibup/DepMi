import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.adminRole) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { pin } = await req.json().catch(() => ({}));
    if (!pin || pin.length < 4) return NextResponse.json({ error: 'PIN must be at least 4 characters' }, { status: 400 });

    const hash = await bcrypt.hash(pin, 10);

    await prisma.user.update({
        where: { id: session.user.id },
        data: { adminPinHash: hash }
    });

    return NextResponse.json({ success: true });
}
