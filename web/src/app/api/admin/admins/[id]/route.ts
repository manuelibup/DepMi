import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    const check = requireAdmin(session, 'SUPER_ADMIN');
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

    const { id } = await params;
    const { role } = await req.json().catch(() => ({})) as { role?: string };
    const validRoles = ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'];

    if (!role || !validRoles.includes(role)) {
        return NextResponse.json({ error: 'Valid role required' }, { status: 400 });
    }

    // Prevent demoting yourself
    if (id === session!.user.id) {
        return NextResponse.json({ error: 'Cannot change your own role' }, { status: 403 });
    }

    await prisma.user.update({ where: { id }, data: { adminRole: role as never } });
    return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    const check = requireAdmin(session, 'SUPER_ADMIN');
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

    const { id } = await params;

    if (id === session!.user.id) {
        return NextResponse.json({ error: 'Cannot remove your own admin role' }, { status: 403 });
    }

    await prisma.user.update({ where: { id }, data: { adminRole: null } });
    return NextResponse.json({ success: true });
}
