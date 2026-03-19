import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Simple in-memory rate limiter: max 60 events per sessionId per minute
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(sessionId: string): boolean {
    const now = Date.now();
    const entry = rateLimitMap.get(sessionId);
    if (!entry || now > entry.resetAt) {
        rateLimitMap.set(sessionId, { count: 1, resetAt: now + 60_000 });
        return false;
    }
    if (entry.count >= 60) return true;
    entry.count++;
    return false;
}

// Clean up old entries every 5 minutes to avoid memory leak
setInterval(() => {
    const now = Date.now();
    for (const [key, val] of rateLimitMap) {
        if (now > val.resetAt) rateLimitMap.delete(key);
    }
}, 5 * 60 * 1000);

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { type, sessionId, targetId, targetType, metadata } = body;

        if (!type || !sessionId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const validTypes = [
            'FEED_IMPRESSION', 'PRODUCT_VIEW', 'DEMAND_VIEW', 'STORE_VIEW',
            'SEARCH', 'LIKE', 'SAVE', 'BID', 'ORDER', 'SHARE',
        ];
        if (!validTypes.includes(type)) {
            return NextResponse.json({ error: 'Invalid event type' }, { status: 400 });
        }

        if (isRateLimited(sessionId)) {
            return NextResponse.json({ ok: true }); // silently drop — don't error client
        }

        const session = await getServerSession(authOptions);
        const userId = session?.user?.id ?? null;

        // Check opt-out
        if (userId) {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { analyticsOptOut: true },
            });
            if (user?.analyticsOptOut) {
                return NextResponse.json({ ok: true });
            }
        }

        await prisma.event.create({
            data: {
                type,
                sessionId,
                userId,
                targetId: targetId ?? null,
                targetType: targetType ?? null,
                metadata: metadata ?? undefined,
            },
        });

        return NextResponse.json({ ok: true });
    } catch {
        // Fire-and-forget — never surface errors to client
        return NextResponse.json({ ok: true });
    }
}
