import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';

export async function GET() {
    const session = await getServerSession(authOptions);
    const check = requireAdmin(session, 'ADMIN');
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

    const config = await prisma.referralConfig.upsert({
        where: { id: 'singleton' },
        update: {},
        create: { id: 'singleton', globalEnabled: false, rewardPercentage: 5.0, durationDays: 30 },
    });

    return NextResponse.json(config);
}

export async function PATCH(req: NextRequest) {
    const session = await getServerSession(authOptions);
    const check = requireAdmin(session, 'SUPER_ADMIN');
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

    const body = await req.json().catch(() => ({})) as {
        globalEnabled?: boolean;
        rewardPercentage?: number;
        durationDays?: number;
    };

    const config = await prisma.referralConfig.upsert({
        where: { id: 'singleton' },
        update: {
            ...(typeof body.globalEnabled === 'boolean' && { globalEnabled: body.globalEnabled }),
            ...(typeof body.rewardPercentage === 'number' && { rewardPercentage: body.rewardPercentage }),
            ...(typeof body.durationDays === 'number' && { durationDays: body.durationDays }),
        },
        create: {
            id: 'singleton',
            globalEnabled: body.globalEnabled ?? false,
            rewardPercentage: body.rewardPercentage ?? 5.0,
            durationDays: body.durationDays ?? 30,
        },
    });

    return NextResponse.json(config);
}
