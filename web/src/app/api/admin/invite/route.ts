import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        // Admin guard — only the email in ADMIN_EMAIL env var can use this route.
        // Add ADMIN_EMAIL=your@email.com to .env.local and Vercel environment variables.
        if (!session?.user?.id) {
            return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
        }

        const adminEmail = process.env.ADMIN_EMAIL;
        if (!adminEmail || session.user.email !== adminEmail) {
            return NextResponse.json({ message: "Forbidden. Admin access only." }, { status: 403 });
        }

        const body = await req.json();
        const { email } = body;

        if (!email) {
            return NextResponse.json({ message: "Email is required" }, { status: 400 });
        }

        // Check if an invite already exists and is pending
        const existingInvite = await prisma.storeInvite.findFirst({
            where: {
                email,
                status: "PENDING"
            }
        });

        if (existingInvite) {
            // Check if it's expired
            if (new Date() > existingInvite.expiresAt) {
                await prisma.storeInvite.update({
                    where: { id: existingInvite.id },
                    data: { status: "EXPIRED" }
                });
                // We'll proceed to create a new one below
            } else {
                return NextResponse.json(
                    { message: "Active invite already sent to this email", inviteId: existingInvite.id },
                    { status: 409 }
                );
            }
        }

        // Generate a new Invite covering the next 48 hours
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 48);

        const invite = await prisma.storeInvite.create({
            data: {
                email,
                expiresAt,
            }
        });

        // In a real production app, we would integrate SendGrid, Postmark, or AWS SES right here 
        // to email the invite link: `https://depmi.com/invite/${invite.id}`. 
        // For the pilot MVP, we will simply return the link directly in the API response 
        // so you can instantly copy it and paste it to the vendor in WhatsApp or X DMs!

        const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${invite.id}`;

        return NextResponse.json({
            message: "Invite generated successfully",
            inviteUrl,
            expiresAt
        }, { status: 201 });

    } catch (error: unknown) {
        console.error("Admin Invite Error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
