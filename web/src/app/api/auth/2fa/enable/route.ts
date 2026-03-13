import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { authenticator } from '@otplib/preset-default';

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { code } = await req.json().catch(() => ({}));
    if (!code) return NextResponse.json({ error: 'Code is required' }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user || !user.totpSecret) return NextResponse.json({ error: '2FA not initialized' }, { status: 400 });

    const isValid = authenticator.verify({ token: code, secret: user.totpSecret });
    if (!isValid) return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });

    await prisma.user.update({
        where: { id: user.id },
        data: { totpEnabled: true }
    });

    return NextResponse.json({ success: true });
}
