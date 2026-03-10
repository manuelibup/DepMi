import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyOtp } from '@/lib/otp';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { code } = await req.json();
        if (!code || typeof code !== 'string') {
            return NextResponse.json({ message: 'Verification code is required' }, { status: 400 });
        }

        const isValid = await verifyOtp(session.user.id, 'EMAIL_VERIFICATION', code);
        if (!isValid) {
            return NextResponse.json({ message: 'Invalid or expired code' }, { status: 400 });
        }

        await prisma.user.update({
            where: { id: session.user.id },
            data: { emailVerified: true },
        });

        return NextResponse.json({ message: 'Email verified successfully' });
    } catch (err) {
        console.error('verify-email error:', err);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
