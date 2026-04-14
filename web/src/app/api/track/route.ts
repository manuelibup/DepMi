import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { EventType } from '@prisma/client';

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

// ── Batched write queue ────────────────────────────────────────────────────────
// Events are queued in memory and flushed to DB every 30 seconds.
// This prevents one DB write per scroll impression, which was keeping Neon awake.
interface QueuedEvent {
    type: EventType;
    sessionId: string;
    userId: string | null;
    targetId: string | null;
    targetType: string | null;
    metadata: Record<string, unknown> | undefined;
}

const eventQueue: QueuedEvent[] = [];

async function flushQueue() {
    if (eventQueue.length === 0) return;
    const batch = eventQueue.splice(0, eventQueue.length);
    try {
        await prisma.event.createMany({ data: batch });
    } catch {
        // If flush fails, drop the batch rather than block the queue indefinitely
    }
}

// Flush every 30 seconds — only fires when the serverless function is warm
setInterval(flushQueue, 30_000);

// Clean up old rate limit entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, val] of rateLimitMap) {
        if (now > val.resetAt) rateLimitMap.delete(key);
    }
}, 5 * 60 * 1000);

// Cache opted-out user IDs to avoid a DB lookup on every event
const optOutCache = new Set<string>();
const optOutCacheExpiry = new Map<string, number>();
const OPT_OUT_TTL = 5 * 60 * 1000; // 5 minutes

async function isOptedOut(userId: string): Promise<boolean> {
    const expiry = optOutCacheExpiry.get(userId);
    if (expiry && Date.now() < expiry) {
        return optOutCache.has(userId);
    }
    // Cache miss — check DB
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { analyticsOptOut: true },
    });
    const opted = user?.analyticsOptOut ?? false;
    if (opted) {
        optOutCache.add(userId);
    } else {
        optOutCache.delete(userId);
    }
    optOutCacheExpiry.set(userId, Date.now() + OPT_OUT_TTL);
    return opted;
}

// High-value commerce events only — FEED_IMPRESSION / STORE_VIEW / DEMAND_VIEW
// are dropped here and tracked by PostHog instead, saving ~85% of Event inserts.
const validTypes = [
    'PRODUCT_VIEW',
    'SEARCH', 'LIKE', 'SAVE', 'BID', 'ORDER', 'SHARE',
];

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { type, sessionId, targetId, targetType, metadata } = body;

        if (!type || !sessionId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (!validTypes.includes(type)) {
            return NextResponse.json({ error: 'Invalid event type' }, { status: 400 });
        }

        if (isRateLimited(sessionId)) {
            return NextResponse.json({ ok: true });
        }

        const session = await getServerSession(authOptions);
        const userId = session?.user?.id ?? null;

        if (userId && await isOptedOut(userId)) {
            return NextResponse.json({ ok: true });
        }

        // Queue instead of writing immediately
        eventQueue.push({
            type: type as EventType,
            sessionId,
            userId,
            targetId: targetId ?? null,
            targetType: targetType ?? null,
            metadata: metadata ?? undefined,
        });

        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ ok: true });
    }
}
