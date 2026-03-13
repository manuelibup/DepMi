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
    const { active } = await req.json().catch(() => ({})) as { active?: boolean };

    if (typeof active !== 'boolean') {
        return NextResponse.json({ error: 'active (boolean) is required' }, { status: 400 });
    }

    await prisma.store.update({ where: { id }, data: { isActive: active } });
    return NextResponse.json({ success: true });
}
