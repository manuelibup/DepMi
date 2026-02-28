import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const token = searchParams.get('token');

        if (!token) {
            return NextResponse.json({ message: "No invite token provided", status: "NOT_FOUND" }, { status: 400 });
        }

        const invite = await prisma.storeInvite.findUnique({
            where: { id: token }
        });

        if (!invite) {
            return NextResponse.json({ message: "Invalid invite link", status: "NOT_FOUND" }, { status: 404 });
        }

        // Check if it's already accepted
        if (invite.status === "ACCEPTED") {
            return NextResponse.json({ status: "ACCEPTED" }, { status: 200 });
        }

        // Check if it's expired
        if (new Date() > invite.expiresAt || invite.status === "EXPIRED") {
            // Update to EXPIRED if it wasn't already marked
            if (invite.status !== "EXPIRED") {
                await prisma.storeInvite.update({
                    where: { id: invite.id },
                    data: { status: "EXPIRED" }
                });
            }
            return NextResponse.json({ message: "Invite link has expired", status: "EXPIRED" }, { status: 410 });
        }

        // Return VALID
        return NextResponse.json({ status: "VALID" }, { status: 200 });

    } catch (error: unknown) {
        console.error("Invite Validation Error:", error);
        return NextResponse.json({ message: "Internal server error", status: "NOT_FOUND" }, { status: 500 });
    }
}
