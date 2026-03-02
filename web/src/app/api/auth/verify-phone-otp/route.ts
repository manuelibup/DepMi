import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ message: "Unauthorized. Please sign in." }, { status: 401 });
        }

        const body = await req.json();
        const { phoneNumber, code } = body;

        if (!phoneNumber || !code || code.length !== 6) {
            return NextResponse.json({ message: "A valid phone number and 6-digit code are required." }, { status: 400 });
        }

        // 1. Double-check number availability (Race condition prevention)
        const conflictUser = await prisma.user.findFirst({
            where: {
                phoneNumber,
                phoneVerified: true,
                NOT: { id: session.user.id }
            }
        });

        if (conflictUser) {
            return NextResponse.json({ message: "Phone number already verified on another account." }, { status: 409 });
        }

        // 2. Fetch the latest active OTP for this user
        const otpRecord = await prisma.otpToken.findFirst({
            where: {
                userId: session.user.id,
                type: "PHONE_VERIFICATION",
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

        // 3. Verify the Code with Termii using the stored pin_id (codeHash)
        const termiiPayload = {
            api_key: process.env.TERMII_API_KEY,
            pin_id: otpRecord.codeHash, // We stored Termii's pin_id here during sending
            pin: code
        };

        const termiiResponse = await fetch("https://api.ng.termii.com/api/sms/otp/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(termiiPayload)
        });

        const termiiData = await termiiResponse.json();

        const isVerified = termiiData.verified === true || termiiData.verified === "true";
        if (!termiiResponse.ok || !isVerified) {
            const errorMsg = termiiData.message || "Invalid or expired verification code.";
            return NextResponse.json({ message: errorMsg }, { status: 400 });
        }

        // 4. Success! Mark OTP as used and update User Profile
        await prisma.$transaction(async (tx) => {
            await tx.otpToken.update({
                where: { id: otpRecord.id },
                data: { used: true }
            });

            const currentUser = await tx.user.findUnique({ where: { id: session.user.id } });

            // Only bump KYC to TIER_0 if they are currently unverified. (If they are TIER_2 vendors changing numbers, don't demote them!)
            const newKycTier = currentUser?.kycTier === "UNVERIFIED" ? "TIER_0" : currentUser?.kycTier;

            await tx.user.update({
                where: { id: session.user.id },
                data: {
                    phoneNumber,
                    phoneVerified: true,
                    kycTier: newKycTier
                }
            });
        });

        return NextResponse.json({ message: "Phone number verified successfully!" }, { status: 200 });

    } catch (error: unknown) {
        // Phone number claimed by another user between our pre-check and the DB update
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            return NextResponse.json(
                { message: "Phone number already verified on another account." },
                { status: 409 }
            );
        }
        console.error("OTP Verification Error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
