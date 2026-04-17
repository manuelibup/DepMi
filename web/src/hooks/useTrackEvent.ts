import { useCallback } from 'react';
import { usePostHog } from 'posthog-js/react';

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
    const posthog = usePostHog();

    const track = useCallback(
        (
            type: EventType,
            opts?: {
                targetId?: string;
                targetType?: string;
                metadata?: Record<string, unknown>;
            },
        ) => {
            const utm = getUtm();
            // Merge UTM into metadata
            const metadata = {
                ...(utm || {}),
                ...(opts?.metadata || {}),
                targetId: opts?.targetId,
                targetType: opts?.targetType,
            };

            // Captured directly in PostHog — zero load on Vercel
            if (posthog) {
                posthog.capture(type, metadata);
            }
        },
        [posthog],
    );

    return track;
}
