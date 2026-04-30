import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ domain: string }> }) {
    const session = await getServerSession(authOptions);
    const check = requireAdmin(session, 'ADMIN');
    if (!check.ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { domain } = await params;
    const { action } = await req.json() as { action: 'approve' | 'reject' };

    if (!['approve', 'reject'].includes(action)) {
        return NextResponse.json({ error: 'action must be approve or reject' }, { status: 400 });
    }

    const status = action === 'approve' ? 'APPROVED' : 'REJECTED';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const link = await (prisma as any).approvedLink.updateMany({
        where: { domain },
        data: { status },
    });

    if (link.count === 0) {
        return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
    }

    // Notify the submitter
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const submission = await (prisma as any).approvedLink.findFirst({ where: { domain } });
    if (submission?.submittedBy) {
        await prisma.notification.create({
            data: {
                userId: submission.submittedBy,
                type: 'SYSTEM',
                title: action === 'approve' ? `Link approved: ${domain}` : `Link rejected: ${domain}`,
                body: action === 'approve'
                    ? `Your link submission for ${domain} has been approved. You and everyone else can now post links from this domain on DepMi.`
                    : `Your link submission for ${domain} was not approved. External links from this domain are not permitted on DepMi.`,
                link: '/links',
            },
        });
    }

    return NextResponse.json({ ok: true, domain, status });
}
