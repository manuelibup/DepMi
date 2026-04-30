import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { sendTelegramMessage } from '@/lib/bot/telegram';

const schema = z.object({
    url: z.string().url('Must be a valid URL'),
    reason: z.string().min(10, 'Please explain why this link should be approved').max(500),
});

function extractDomain(url: string): string {
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return url.replace(/^www\./, '').split('/')[0];
    }
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

    const { url, reason } = parsed.data;
    const domain = extractDomain(url);

    if (domain === 'depmi.com') {
        return NextResponse.json({ error: 'DepMi links are always allowed.' }, { status: 400 });
    }

    // Check if already exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing = await (prisma as any).approvedLink.findFirst({ where: { domain } });
    if (existing?.status === 'APPROVED') {
        return NextResponse.json({ message: 'This domain is already approved. You can post links from it freely.' });
    }
    if (existing?.status === 'PENDING') {
        return NextResponse.json({ message: 'A review request for this domain is already pending. We\'ll notify you when it\'s reviewed.' });
    }

    // Create submission
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).approvedLink.create({
        data: {
            url,
            domain,
            submittedBy: session.user.id,
            status: 'PENDING',
            reviewNote: reason,
        },
    });

    // Notify admin via Telegram
    const adminChatId = process.env.ADMIN_CHAT_ID;
    if (adminChatId) {
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { displayName: true, username: true },
        });
        sendTelegramMessage(
            adminChatId,
            `🔗 <b>New link approval request</b>\n\n` +
            `From: <b>${user?.displayName ?? 'Unknown'}</b> (@${user?.username ?? '?'})\n` +
            `Domain: <code>${domain}</code>\n` +
            `URL: ${url}\n` +
            `Reason: ${reason}\n\n` +
            `Reply with:\n` +
            `/admin approvelink ${domain}\n` +
            `/admin rejectlink ${domain}`,
            'HTML'
        ).catch(() => {});
    }

    return NextResponse.json({ message: 'Link submitted for review. We\'ll notify you once it\'s been reviewed.' }, { status: 201 });
}
