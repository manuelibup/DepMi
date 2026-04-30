import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    const check = requireAdmin(session, 'MODERATOR');
    if (!check.ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const { issueStrike = false, reason = 'community guidelines violation' } = await req.json().catch(() => ({}));

    const demand = await prisma.demand.findUnique({ where: { id }, select: { id: true, userId: true } });
    if (!demand) return NextResponse.json({ error: 'Demand not found' }, { status: 404 });

    await prisma.demand.update({ where: { id }, data: { isActive: false } });

    if (issueStrike) {
        const [, updated] = await prisma.$transaction([
            prisma.strike.create({ data: { userId: demand.userId, reason, context: `Demand ${id} removed by admin` } }),
            prisma.user.update({
                where: { id: demand.userId },
                data: { strikeCount: { increment: 1 } },
                select: { strikeCount: true },
            }),
        ]);

        const newCount = updated.strikeCount;
        const STRIKE_LIMIT = 5;

        if (newCount >= STRIKE_LIMIT) {
            await prisma.user.update({ where: { id: demand.userId }, data: { isBanned: true } });
            await prisma.notification.create({
                data: {
                    userId: demand.userId,
                    type: 'SYSTEM',
                    title: 'Your account has been suspended',
                    body: 'You have been suspended for repeatedly violating DepMi community guidelines. Contact support to appeal.',
                    link: '/help',
                },
            });
        } else {
            const remaining = STRIKE_LIMIT - newCount;
            await prisma.notification.create({
                data: {
                    userId: demand.userId,
                    type: 'SYSTEM',
                    title: `Warning: Strike ${newCount} of ${STRIKE_LIMIT} — Request removed`,
                    body: `Your request was removed for containing ${reason}. This violates DepMi community guidelines. ${remaining} more violation${remaining === 1 ? '' : 's'} will result in a suspension.`,
                    link: '/help',
                },
            });
        }
    }

    return NextResponse.json({ ok: true });
}
