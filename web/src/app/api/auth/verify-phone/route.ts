import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { phoneNumber, code } = await req.json();
        if (!phoneNumber || !code) {
            return NextResponse.json({ message: 'Phone number and code are required' }, { status: 400 });
        }

        if (!process.env.TERMII_API_KEY) {
            return NextResponse.json({ message: 'SMS service not configured' }, { status: 503 });
        }

        // Fetch the stored Termii pinId from the latest unused PHONE_VERIFICATION token
        const token = await prisma.otpToken.findFirst({
            where: {
                userId: session.user.id,
                type: 'PHONE_VERIFICATION',
                used: false,
                expiresAt: { gt: new Date() },
            },
            orderBy: { createdAt: 'desc' },
        });

        if (!token) {
            return NextResponse.json({ message: 'No pending verification found. Please request a new code.' }, { status: 400 });
        }

        // Verify with Termii using the stored pinId
        const termiiRes = await fetch('https://api.ng.termii.com/api/sms/otp/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_key: process.env.TERMII_API_KEY,
                otp: code,
                pin_id: token.codeHash, // stored pinId
            }),
        });

        const termiiData = await termiiRes.json();

        if (!termiiRes.ok || termiiData.verified !== 'True') {
            return NextResponse.json({ message: 'Invalid or expired code' }, { status: 400 });
        }

        // Mark token used + save phone as verified
        await prisma.$transaction([
            prisma.otpToken.update({ where: { id: token.id }, data: { used: true } }),
            prisma.user.update({
                where: { id: session.user.id },
                data: { phoneNumber, phoneVerified: true },
            }),
        ]);

        return NextResponse.json({ message: 'Phone number verified successfully' });
    } catch (err) {
        console.error('verify-phone error:', err);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
