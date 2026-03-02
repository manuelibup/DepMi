import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ message: "Unauthorized. Please sign in." }, { status: 401 });
        }

        const body = await req.json();
        const { phoneNumber } = body;

        if (!phoneNumber || !/^\+?[1-9]\d{1,14}$/.test(phoneNumber)) {
            return NextResponse.json({ message: "Invalid phone number format." }, { status: 400 });
        }

        // PRE-CHECK: Ensure this phone number isn't already claimed by another user
        const existingUser = await prisma.user.findUnique({
            where: { phoneNumber }
        });

        if (existingUser && existingUser.id !== session.user.id) {
            return NextResponse.json(
                { message: "This phone number is already verified on another account. Please log into that account or use a different number." },
                { status: 409 }
            );
        }

        if (!process.env.TERMII_API_KEY) {
            console.error("TERMII_API_KEY is not set");
            return NextResponse.json({ message: "SMS service is not configured." }, { status: 503 });
        }

        // Termii requires OTP sent via external request for DND support
        const termiiPayload = {
            api_key: process.env.TERMII_API_KEY,
            message_type: "NUMERIC",
            to: phoneNumber,
            from: process.env.TERMII_SENDER_ID || "DepMi",
            channel: "dnd", // CRITICAL for Nigeria DND compliance
            pin_attempts: 3,
            pin_time_to_live: 10,
            pin_length: 6,
            pin_placeholder: "< 1234 >",
            message_text: "Your DepMi verification code is < 1234 >. Valid for 10 minutes.",
            pin_type: "NUMERIC"
        };

        const termiiResponse = await fetch("https://api.ng.termii.com/api/sms/otp/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(termiiPayload)
        });

        if (!termiiResponse.ok) {
            console.error("Termii HTTP Error:", await termiiResponse.text());
            return NextResponse.json({ message: "Failed to send SMS OTP. Please try again later." }, { status: 502 });
        }

        const termiiData = await termiiResponse.json();

        if (!termiiData.pinId) {
            console.error("Termii Logic Error:", termiiData);
            return NextResponse.json({ message: "SMS provider failed to generate OTP." }, { status: 502 });
        }

        // Calculate Expiration based on Termii's TTL (10 minutes)
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 10);

        // Store the Termii pinId instead of a bcrypt hash
        await prisma.$transaction([
            prisma.otpToken.updateMany({
                where: { userId: session.user.id, used: false, type: "PHONE_VERIFICATION" },
                data: { used: true }
            }),
            prisma.otpToken.create({
                data: {
                    userId: session.user.id,
                    type: "PHONE_VERIFICATION",
                    codeHash: termiiData.pinId, // Store pinId provided by Termii
                    expiresAt
                }
            })
        ]);

        return NextResponse.json({
            message: "OTP sent successfully!"
        }, { status: 200 });

    } catch (error: unknown) {
        console.error("OTP Generation Error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
