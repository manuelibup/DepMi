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

function getSessionId(): string {
    if (typeof window === 'undefined') return 'ssr';
    let id = localStorage.getItem('_dm_sid');
    if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem('_dm_sid', id);
    }
    return id;
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
            // Fire-and-forget — never await, never block UI
            fetch('/api/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, sessionId, ...opts }),
            }).catch(() => {});
        },
        [],
    );

    return track;
}
