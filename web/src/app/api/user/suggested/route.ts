import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const session = await getServerSession(authOptions);

    // Build where clause — exclude self if logged in
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { onboardingComplete: true };
    if (session?.user?.id) {
        where.id = { not: session.user.id };
    }

    // Return users ordered by follower count desc, up to 30
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const users = await (prisma.user as any).findMany({
        where,
        select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            bio: true,
            _count: { select: { followers: true } },
        },
        orderBy: { followers: { _count: 'desc' } },
        take: 30,
    });

    return NextResponse.json({ users });
}
