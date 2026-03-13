import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const onboardingSchema = z.object({
    username: z.string()
        .min(3, "Username must be at least 3 characters")
        .max(20, "Username must be at most 20 characters")
        .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
    displayName: z.string().min(2, "Display Name must be at least 2 characters").max(50),
});

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { username, displayName } = onboardingSchema.parse(body);

        // Check if username is already taken by someone else
        const existingUser = await prisma.user.findUnique({
            where: { username },
        });

        if (existingUser && existingUser.id !== session.user.id) {
            return NextResponse.json({ message: "Username is already taken" }, { status: 400 });
        }

        // Save username + display name (onboardingComplete set in /api/user/complete-onboarding)
        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                username,
                displayName,
            },
        });

        return NextResponse.json({ message: "Username saved" });
     
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ message: error.issues[0].message }, { status: 400 });
        }
        console.error("Onboarding error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
