import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcrypt";
import { Resend } from "resend";

export async function POST(req: Request) {
    try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ message: "Unauthorized. Please sign in." }, { status: 401 });
        }

        const body = await req.json();
        const { email } = body;

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return NextResponse.json({ message: "A valid email address is required." }, { status: 400 });
        }

        // Must match the current user's email or block the request
        const currentUser = await prisma.user.findUnique({
            where: { id: session.user.id }
        });

        if (!currentUser?.email || currentUser.email !== email) {
            return NextResponse.json({ message: "Email specified does not match your active account." }, { status: 403 });
        }

        // Generate 6-digit Email OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

        // Hash it for secure storage
        const salt = await bcrypt.genSalt(10);
        const codeHash = await bcrypt.hash(otpCode, salt);

        // Expiration (10 minutes)
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 10);

        // Transactional insertion
        await prisma.$transaction([
            prisma.otpToken.updateMany({
                where: { userId: session.user.id, used: false, type: "EMAIL_RESET" },
                data: { used: true }
            }),
            prisma.otpToken.create({
                data: {
                    userId: session.user.id,
                    type: "EMAIL_RESET",
                    codeHash,
                    expiresAt
                }
            })
        ]);

        // Dispatch Email via Resend
        const { error } = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || "DepMi <noreply@depmi.com>",
            to: email,
            subject: "Your DepMi verification code",
            html: `
                <div style="font-family: sans-serif; padding: 20px; color: #111;">
                    <h2>Verify your email</h2>
                    <p>Your DepMi verification code is:</p>
                    <h1 style="letter-spacing: 5px; font-size: 32px; font-family: monospace;">${otpCode}</h1>
                    <p>This code expires in 10 minutes. If you didn't request this, please ignore this email.</p>
                </div>
            `,
        });

        if (error) {
            console.error("Resend API Error:", error);
            return NextResponse.json({ message: "Failed to send email. Please try again." }, { status: 502 });
        }

        return NextResponse.json({ message: "Verification code sent successfully!" }, { status: 200 });

    } catch (error: unknown) {
        console.error("Email OTP Generation Error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
