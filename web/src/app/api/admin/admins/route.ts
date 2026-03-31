import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';

export async function GET() {
    const session = await getServerSession(authOptions);
    const check = requireAdmin(session, 'SUPER_ADMIN');
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

    const admins = await prisma.user.findMany({
        where: { adminRole: { not: null } },
        orderBy: { createdAt: 'asc' },
        select: {
            id: true, displayName: true, email: true, username: true,
            avatarUrl: true, adminRole: true, createdAt: true, lastActiveAt: true,
        },
    });

    return NextResponse.json(admins.map(a => ({
        ...a,
        createdAt: a.createdAt.toISOString(),
        lastActiveAt: a.lastActiveAt?.toISOString() ?? null,
    })));
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    const check = requireAdmin(session, 'SUPER_ADMIN');
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

    const { userId, role } = await req.json().catch(() => ({})) as { userId?: string; role?: string };
    const validRoles = ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'];

    if (!userId || !role || !validRoles.includes(role)) {
        return NextResponse.json({ error: 'userId and valid role required' }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
        where: { OR: [{ id: userId }, { username: userId }, { email: userId }] },
        select: { id: true, isBanned: true },
    });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (user.isBanned) return NextResponse.json({ error: 'Cannot grant admin role to a banned user' }, { status: 403 });

    const updated = await prisma.user.update({
        where: { id: user.id },
        data: { adminRole: role as never },
        select: { id: true, displayName: true, adminRole: true },
    });

    return NextResponse.json(updated);
}
