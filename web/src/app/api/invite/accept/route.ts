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
        const { token, bvn } = body;

        if (!token || !bvn) {
            return NextResponse.json({ message: "Invite token and BVN are required." }, { status: 400 });
        }

        // Validate the BVN format (must be 11 digits)
        if (!/^\d{11}$/.test(bvn)) {
            return NextResponse.json({ message: "BVN must be exactly 11 digits." }, { status: 400 });
        }

        // 1. Fetch and validate the invite
        const invite = await prisma.storeInvite.findUnique({
            where: { id: token }
        });

        if (!invite) {
            return NextResponse.json({ message: "Invalid invite link." }, { status: 404 });
        }

        if (invite.status === "ACCEPTED") {
            // Might happen if the user clicks back or submits twice
            return NextResponse.json({ message: "This invite has already been accepted." }, { status: 409 });
        }

        if (new Date() > invite.expiresAt || invite.status === "EXPIRED") {
            return NextResponse.json({ message: "This invite link has expired." }, { status: 410 });
        }

        // 2. The Dojah/Smile ID Verification Step 
        // ----------------------------------------------------------------------------------
        // In reality, here we would make a server-to-server POST request to the Dojah API.
        // E.g.
        // const dojahRes = await fetch('https://api.dojah.io/api/v1/kyc/bvn', {
        //      headers: { 'Authorization': process.env.DOJAH_API_KEY!, 'AppId': process.env.DOJAH_APP_ID! }
        //      body: JSON.stringify({ bvn })
        // })
        // const dojahData = await dojahRes.json();
        // if (!dojahData.entity) throw new Error("Invalid BVN");
        //
        // But for the MVP MVP pilot, we mock a successful network call here since you 
        // (the admin) are manually handing out these links to trusted parties anyway.
        // ----------------------------------------------------------------------------------

        // KYC Verification — Dojah API (mocked for MVP pilot, real in production)
        // The admin manually vets invite recipients during the pilot, so mock is safe here.
        if (process.env.NODE_ENV === "production" && !process.env.DOJAH_API_KEY) {
            console.error("DOJAH_API_KEY is not set in production");
            return NextResponse.json({ message: "KYC service is not configured." }, { status: 503 });
        }

        // Mock 1.5 second API latency (replace this block with real Dojah call when ready)
        await new Promise(resolve => setTimeout(resolve, 1500));
        const mockDojahRef = `dojah_ref_${Math.random().toString(36).substring(2, 15)}`;

        // 3. Update the Database in a Transaction
        await prisma.$transaction(async (tx) => {
            // A. Mark the Invite as Accepted by this user
            await tx.storeInvite.update({
                where: { id: invite.id },
                data: {
                    status: "ACCEPTED",
                    userId: session.user.id
                }
            });

            // B. Upsert KycStatus to track the BVN reference
            await tx.kycStatus.upsert({
                where: { userId: session.user.id },
                create: {
                    userId: session.user.id,
                    bvnRef: mockDojahRef,
                },
                update: {
                    bvnRef: mockDojahRef,
                }
            });

            // C. Elevate User to TIER_2 (Vendor)
            await tx.user.update({
                where: { id: session.user.id },
                data: { kycTier: "TIER_2" }
            });
        });

        return NextResponse.json({
            message: "Identity verified! You are now a vendor.",
            status: "ACCEPTED"
        }, { status: 200 });

    } catch (error: unknown) {
        console.error("Invite Acceptance Error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
