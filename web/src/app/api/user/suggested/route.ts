import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const USER_SELECT = {
    id: true,
    username: true,
    displayName: true,
    avatarUrl: true,
    bio: true,
    adminRole: true,
    _count: { select: { followers: true } },
} as const;

function shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

export async function GET() {
    const session = await getServerSession(authOptions);
    const selfId = session?.user?.id;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
        onboardingComplete: true,
        ...(selfId && { id: { not: selfId } }),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const all = await (prisma.user as any).findMany({
        where,
        select: USER_SELECT,
        take: 50,
    });

    // Pin the SUPER_ADMIN user first, shuffle everyone else
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const superAdmin = all.find((u: any) => u.adminRole === 'SUPER_ADMIN');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rest = shuffle(all.filter((u: any) => u.adminRole !== 'SUPER_ADMIN'));

    const users = superAdmin ? [superAdmin, ...rest] : rest;

    return NextResponse.json({ users: users.slice(0, 30) });
}
