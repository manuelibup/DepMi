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

        /* 
         * Pilot Phase (0-100 vendors): KYC gate is disabled.
         * Anyone can create a store for free during the launch pilot.
         */
        // const allowedTiers: KycTier[] = ["TIER_2", "TIER_3", "BUSINESS"];
        // if (!allowedTiers.includes(user.kycTier)) {
        //     return NextResponse.json({ message: "Store creation requires Identity Verification (TIER_2)." }, { status: 403 });
        // }

        const body = await req.json();
        const { name, slug, description, location, logoUrl } = body;

        if (!name || !slug) {
            return NextResponse.json({ message: "Store name and handle (@slug) are required." }, { status: 400 });
        }

        const normalizedSlug = slug.toLowerCase().replace(/[^a-z0-9]/g, '');

        if (normalizedSlug.length < 3) {
            return NextResponse.json({ message: "Handle must be at least 3 characters long." }, { status: 400 });
        }

        // One store per user — redirect to existing store if they already have one
        const existingStore = await prisma.store.findFirst({
            where: { ownerId: session.user.id },
            select: { slug: true },
        });
        if (existingStore) {
            return NextResponse.json({
                message: "You already have a store.",
                redirect: `/store/${existingStore.slug}`,
            }, { status: 409 });
        }

        // Collision Checks
        const storeConflict = await prisma.store.findFirst({
            where: {
                OR: [
                    { name: name },
                    { slug: normalizedSlug }
                ]
            }
        });

        if (storeConflict) {
            if (storeConflict.name.toLowerCase() === name.toLowerCase()) {
                return NextResponse.json({ message: "Store name is already taken." }, { status: 409 });
            } else {
                return NextResponse.json({ message: "Store handle is already taken." }, { status: 409 });
            }
        }

        // Block slug if it matches an existing username — clean URLs require uniqueness across both
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const usernameConflict = await (prisma.user as any).findFirst({
            where: { username: { equals: normalizedSlug, mode: 'insensitive' } },
            select: { id: true },
        });
        if (usernameConflict) {
            return NextResponse.json({ message: "Store handle is already taken." }, { status: 409 });
        }

        // Create the Store — grant 30-day fee waiver for all new sellers
        const feeWaiverUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        const store = await prisma.store.create({
            data: {
                ownerId: session.user.id,
                name,
                slug: normalizedSlug,
                description,
                location,
                logoUrl,
                isActive: true,
                feeWaiverUntil,
            }
        });

        return NextResponse.json({
            message: "Store created successfully!",
            store
        }, { status: 201 });

    } catch (error: unknown) {
        console.error("Store Creation Error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
