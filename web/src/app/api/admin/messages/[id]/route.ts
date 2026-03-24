import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';

export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    const check = requireAdmin(session, 'ADMIN');
    if (!check.ok) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const { id } = await params;

    const msg = await prisma.message.findUnique({ where: { id }, select: { id: true } });
    if (!msg) return NextResponse.json({ message: 'Not found' }, { status: 404 });

    await prisma.message.delete({ where: { id } });

    return NextResponse.json({ message: 'Message deleted' });
}
