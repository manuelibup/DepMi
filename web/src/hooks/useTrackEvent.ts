'use client';

import { useCallback } from 'react';

type EventType =
    | 'FEED_IMPRESSION'
    | 'PRODUCT_VIEW'
    | 'DEMAND_VIEW'
    | 'STORE_VIEW'
    | 'SEARCH'
    | 'LIKE'
    | 'SAVE'
    | 'BID'
    | 'ORDER'
    | 'SHARE';

const UTM_KEY = '_dm_utm';
const UTM_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

function getSessionId(): string {
    if (typeof window === 'undefined') return 'ssr';
    let id = localStorage.getItem('_dm_sid');
    if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem('_dm_sid', id);
    }
    return id;
}

function getUtm(): Record<string, string> | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(UTM_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw) as Record<string, string | number>;
        if (Date.now() - (data._ts as number) > UTM_TTL) {
            localStorage.removeItem(UTM_KEY);
            return null;
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _ts, ...utm } = data;
        return utm as Record<string, string>;
    } catch {
        return null;
    }
}

export function useTrackEvent() {
    const track = useCallback(
        (
            type: EventType,
            opts?: {
                targetId?: string;
                targetType?: string;
                metadata?: Record<string, unknown>;
            },
        ) => {
            const sessionId = getSessionId();
            const utm = getUtm();
            // Merge UTM into metadata — event-level metadata takes precedence over UTM
            const metadata = utm
                ? { ...utm, ...(opts?.metadata ?? {}) }
                : opts?.metadata;
            // Fire-and-forget — never await, never block UI
            fetch('/api/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, sessionId, ...opts, metadata }),
            }).catch(() => {});
        },
        [],
    );

    return track;
}
