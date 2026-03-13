import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    const check = requireAdmin(session, 'ADMIN');
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

    const { id } = await params;
    const { banned } = await req.json().catch(() => ({})) as { banned?: boolean };

    if (typeof banned !== 'boolean') {
        return NextResponse.json({ error: 'banned (boolean) is required' }, { status: 400 });
    }

    // Prevent banning another admin
    const target = await prisma.user.findUnique({ where: { id }, select: { adminRole: true } });
    if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (target.adminRole) return NextResponse.json({ error: 'Cannot ban an admin user' }, { status: 403 });

    await prisma.user.update({ where: { id }, data: { isBanned: banned } });
    return NextResponse.json({ success: true });
}
