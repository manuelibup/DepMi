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

        const FROM = process.env.RESEND_FROM_EMAIL || 'DepMi <security@depmi.com>';

        // Try SMS first if phone verified, fall through to email on failure
        if (user.phoneNumber && user.phoneVerified && process.env.TERMII_API_KEY) {
            const smsRes = await fetch('https://api.ng.termii.com/api/sms/send', {
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
            if (smsRes.ok) {
                return NextResponse.json({ success: true, channel: 'SMS' });
            }
            const smsErr = await smsRes.text().catch(() => 'unknown');
            console.error('[otp/send] Termii SMS failed:', smsRes.status, smsErr);
            // Fall through to email
        }

        if (user.email) {
            const emailResult = await resend.emails.send({
                from: FROM,
                to: user.email,
                subject: 'Your DepMi Verification Code',
                html: `
                    <div style="font-family:sans-serif;max-width:420px;margin:auto;background:#0a0a0a;border:1px solid #222;border-radius:14px;overflow:hidden">
                        <div style="background:linear-gradient(135deg,#FF5C38,#FF8264);padding:18px 24px">
                            <span style="font-size:1.25rem;font-weight:800;color:#000">DepMi</span>
                        </div>
                        <div style="padding:28px 24px">
                            <h2 style="margin:0 0 8px;color:#fff;font-size:1.2rem">Security Code</h2>
                            <p style="color:#aaa;margin:0 0 20px">Hi ${user.displayName}, use the code below to complete your action. Expires in 10 minutes.</p>
                            <div style="background:#1a1a1a;border:1px solid #333;padding:20px;text-align:center;font-size:2.5rem;font-weight:900;letter-spacing:12px;border-radius:10px;color:#FF5C38">
                                ${code}
                            </div>
                            <p style="color:#555;font-size:0.8rem;margin-top:20px">If you didn't request this, please secure your account immediately.</p>
                        </div>
                    </div>
                `
            });
            if (emailResult.error) {
                console.error('[otp/send] Resend error:', emailResult.error);
                return NextResponse.json({ error: `Email delivery failed: ${emailResult.error.message}` }, { status: 502 });
            }
            return NextResponse.json({ success: true, channel: 'EMAIL' });
        }

        return NextResponse.json({ error: 'No contact method found. Please add an email address to your account.' }, { status: 400 });
    } catch (error) {
        console.error('OTP Send Error:', error);
        const msg = error instanceof Error ? error.message : 'Failed to send OTP';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
