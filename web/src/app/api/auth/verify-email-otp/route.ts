import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcrypt";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ message: "Unauthorized. Please sign in." }, { status: 401 });
        }

        const body = await req.json();
        const { code } = body;

        if (!code || code.length !== 6) {
            return NextResponse.json({ message: "A valid 6-digit code is required." }, { status: 400 });
        }

        // Fetch the user's latest un-usedEMAIL_RESET token
        const otpRecord = await prisma.otpToken.findFirst({
            where: {
                userId: session.user.id,
                type: "EMAIL_RESET",
                used: false
            },
            orderBy: { createdAt: "desc" }
        });

        if (!otpRecord) {
            return NextResponse.json({ message: "No active verification code found. Please request a new one." }, { status: 404 });
        }

        if (new Date() > otpRecord.expiresAt) {
            return NextResponse.json({ message: "The verification code has expired." }, { status: 410 });
        }

        // Verify the Hash
        const isValid = await bcrypt.compare(code, otpRecord.codeHash);

        if (!isValid) {
            return NextResponse.json({ message: "Invalid verification code." }, { status: 400 });
        }

        // Success! Mark OTP as used
        await prisma.otpToken.update({
            where: { id: otpRecord.id },
            data: { used: true }
        });

        return NextResponse.json({ message: "Email code verified successfully!" }, { status: 200 });

    } catch (error: unknown) {
        console.error("Email OTP Verification Error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
