import { NextRequest, NextResponse } from "next/server";
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
    city: true,
    state: true,
    university: true,
    _count: { select: { followers: true } },
} as const;

function shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// GET /api/user/suggested?context=all|location|uni
// Returns users grouped by section when context=all
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    const selfId = session?.user?.id;
    const context = req.nextUrl.searchParams.get('context') ?? 'all';

    const baseWhere = {
        onboardingComplete: true,
        ...(selfId && { id: { not: selfId } }),
    };

    // For 'all' context: return segmented sections (location + uni)
    if (context === 'all' && selfId) {
        const self = await prisma.user.findUnique({
            where: { id: selfId },
            select: { state: true, city: true, university: true },
        });

        const [byLocation, byUni, general] = await Promise.all([
            // From same state
            self?.state
                ? prisma.user.findMany({
                    where: { ...baseWhere, state: self.state },
                    select: USER_SELECT,
                    take: 20,
                })
                : Promise.resolve([]),
            // From same university
            self?.university
                ? prisma.user.findMany({
                    where: { ...baseWhere, university: self.university },
                    select: USER_SELECT,
                    take: 20,
                })
                : Promise.resolve([]),
            // General suggestions (fallback / popular)
            prisma.user.findMany({
                where: baseWhere,
                select: USER_SELECT,
                orderBy: { followers: { _count: 'desc' } },
                take: 30,
            }),
        ]);

        // Pin SUPER_ADMIN first in general section
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const superAdmin = (general as any[]).find((u) => u.adminRole === 'SUPER_ADMIN');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const generalRest = shuffle((general as any[]).filter((u) => u.adminRole !== 'SUPER_ADMIN'));
        const generalSorted = superAdmin ? [superAdmin, ...generalRest] : generalRest;

        return NextResponse.json({
            sections: {
                location: shuffle(byLocation as unknown[]).slice(0, 15),
                uni: shuffle(byUni as unknown[]).slice(0, 15),
                general: generalSorted.slice(0, 30),
            },
            // flat list for legacy use
            users: generalSorted.slice(0, 30),
        });
    }

    // Legacy flat list (context not 'all' or unauthenticated)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const all = await (prisma.user as any).findMany({
        where: baseWhere,
        select: USER_SELECT,
        take: 50,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const superAdmin = all.find((u: any) => u.adminRole === 'SUPER_ADMIN');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rest = shuffle(all.filter((u: any) => u.adminRole !== 'SUPER_ADMIN'));
    const users = superAdmin ? [superAdmin, ...rest] : rest;

    return NextResponse.json({ users: users.slice(0, 30) });
}
