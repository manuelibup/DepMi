import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const interests: string[] = Array.isArray(body.interests) ? body.interests : [];
        const referralSource: string | undefined = typeof body.referralSource === 'string' && body.referralSource.trim()
            ? body.referralSource.trim()
            : undefined;
        const university: string | undefined = typeof body.university === 'string' && body.university.trim()
            ? body.university.trim()
            : undefined;
        const faculty: string | undefined = typeof body.faculty === 'string' && body.faculty.trim()
            ? body.faculty.trim()
            : undefined;
        const department: string | undefined = typeof body.department === 'string' && body.department.trim()
            ? body.department.trim()
            : undefined;

        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                interests,
                onboardingComplete: true,
                ...(referralSource && { referralSource }),
                ...(university && { university }),
                ...(faculty && { faculty }),
                ...(department && { department }),
            },
        });

        return NextResponse.json({ message: "Onboarding complete" });
    } catch (error) {
        console.error("Complete-onboarding error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
