import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateOtp } from '@/lib/otp';
import { resend } from '@/lib/resend';
import { AuthProvider } from '@prisma/client';

export async function POST(req: NextRequest) {
    try {
        const { email } = await req.json();

        if (!email || typeof email !== 'string' || !email.includes('@')) {
            return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Check if user exists
        let user = await prisma.user.findUnique({
            where: { email: normalizedEmail }
        });

        // Create shadow user if none exists
        if (!user) {
            const baseDisplayName = normalizedEmail.split('@')[0] || 'Guest';
            
            user = await prisma.user.create({
                data: {
                    email: normalizedEmail,
                    displayName: baseDisplayName,
                    onboardingComplete: false,
                    accounts: {
                        create: {
                            provider: AuthProvider.EMAIL,
                        }
                    }
                }
            });
        }

        // Rate limit OTP generation
        const recentCount = await prisma.otpToken.count({
            where: {
                userId: user.id,
                type: 'EMAIL_VERIFICATION',
                createdAt: { gt: new Date(Date.now() - 10 * 60 * 1000) },
            },
        });
        
        if (recentCount >= 3) {
            return NextResponse.json({ error: 'Too many requests. Please wait before requesting another code.' }, { status: 429 });
        }

        // Generate and send OTP
        const code = await generateOtp(user.id, 'EMAIL_VERIFICATION');

        const FROM = process.env.RESEND_FROM_EMAIL || 'DepMi <security@depmi.com>';

        const emailResult = await resend.emails.send({
            from: FROM,
            to: user.email!,
            subject: 'Your DepMi Checkout Verification Code',
            html: `
                <div style="font-family:sans-serif;max-width:420px;margin:auto;background:#0a0a0a;border:1px solid #222;border-radius:14px;overflow:hidden">
                    <div style="background:linear-gradient(135deg,var(--primary),#FF8264);padding:18px 24px">
                        <span style="font-size:1.25rem;font-weight:800;color:#000">DepMi Checkout</span>
                    </div>
                    <div style="padding:28px 24px">
                        <h2 style="margin:0 0 8px;color:#fff;font-size:1.2rem">Secure Checkout Verification</h2>
                        <p style="color:#aaa;margin:0 0 20px">Hi there, use the code below to complete your checkout and secure your order. Expires in 10 minutes.</p>
                        <div style="background:#1a1a1a;border:1px solid #333;padding:20px;text-align:center;font-size:2.5rem;font-weight:900;letter-spacing:12px;border-radius:10px;color:var(--primary)">
                            ${code}
                        </div>
                    </div>
                </div>
            `
        });

        if (emailResult.error) {
            console.error('[guest-otp/send] Resend error:', emailResult.error);
            return NextResponse.json({ error: 'Email delivery failed due to a server configuration issue. Please contact support or try again later.' }, { status: 502 });
        }

        return NextResponse.json({ success: true, message: 'OTP sent to email.' });
    } catch (error) {
        console.error('Guest checkout OTP Error:', error);
        return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
    }
}
