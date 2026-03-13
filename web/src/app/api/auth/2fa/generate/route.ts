import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';

export async function POST() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(user.email ?? user.username ?? 'User', 'DepMi', secret);

    const qrCodeUrl = await QRCode.toDataURL(otpauth);

    await prisma.user.update({
        where: { id: user.id },
        data: { totpSecret: secret } // totpEnabled stays false until verified
    });

    return NextResponse.json({ secret, qrCodeUrl });
}
