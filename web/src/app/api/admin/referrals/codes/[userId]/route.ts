import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
    const session = await getServerSession(authOptions);
    const check = requireAdmin(session, 'SUPER_ADMIN');
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

    const { userId } = await params;
    const { perUserEnabled } = await req.json().catch(() => ({})) as { perUserEnabled?: boolean };

    if (typeof perUserEnabled !== 'boolean') {
        return NextResponse.json({ error: 'perUserEnabled (boolean) required' }, { status: 400 });
    }

    await prisma.referralCode.update({
        where: { userId },
        data: { perUserEnabled },
    });

    return NextResponse.json({ success: true });
}
