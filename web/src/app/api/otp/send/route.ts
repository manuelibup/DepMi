import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateOtp } from '@/lib/otp';
import { resend } from '@/lib/resend';
import { OtpType } from '@prisma/client';

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { type } = await req.json() as { type: OtpType };
        if (!type || !['TRANSACTIONAL', 'ACCOUNT_UPDATE'].includes(type)) {
            return NextResponse.json({ error: 'Invalid OTP type' }, { status: 400 });
        }

        // Rate limit: max 3 OTPs per type per user per 10 minutes
        const recentCount = await prisma.otpToken.count({
            where: {
                userId: session.user.id,
                type,
                createdAt: { gt: new Date(Date.now() - 10 * 60 * 1000) },
            },
        });
        if (recentCount >= 3) {
            return NextResponse.json({ error: 'Too many requests. Please wait before requesting another code.' }, { status: 429 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { email: true, phoneNumber: true, phoneVerified: true, displayName: true }
        });

        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        const code = await generateOtp(session.user.id, type);

        // Send via SMS if phone is verified, otherwise fallback to Email
        if (user.phoneNumber && user.phoneVerified && process.env.TERMII_API_KEY) {
            await fetch('https://api.ng.termii.com/api/sms/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    api_key: process.env.TERMII_API_KEY,
                    to: user.phoneNumber,
                    from: process.env.TERMII_SENDER_ID || 'DepMi',
                    sms: `Your DepMi verification code is: ${code}. Valid for 10 minutes.`,
                    type: 'plain',
                    channel: 'generic',
                }),
            });
            return NextResponse.json({ success: true, channel: 'SMS' });
        } else if (user.email) {
            await resend.emails.send({
                from: 'DepMi <security@depmi.com>',
                to: user.email,
                subject: 'Your Verification Code',
                html: `
                    <div style="font-family:sans-serif;max-width:400px;margin:auto;border:1px solid #eee;border-radius:12px;padding:24px">
                        <h2 style="margin:0 0 16px">Security Code</h2>
                        <p>Hi ${user.displayName},</p>
                        <p>You requested a verification code for a sensitive action on DepMi. Use the code below to proceed:</p>
                        <div style="background:#f4f4f4;padding:16px;text-align:center;font-size:2rem;font-weight:bold;letter-spacing:8px;border-radius:8px">
                            ${code}
                        </div>
                        <p style="color:#666;font-size:0.85rem;margin-top:24px">This code expires in 10 minutes. If you didn't request this, please secure your account immediately.</p>
                    </div>
                `
            });
            return NextResponse.json({ success: true, channel: 'EMAIL' });
        }

        return NextResponse.json({ error: 'No contact method found' }, { status: 400 });
    } catch (error) {
        console.error('OTP Send Error:', error);
        return NextResponse.json({ error: 'Failed to send OTP' }, { status: 500 });
    }
}
