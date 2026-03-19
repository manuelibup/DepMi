'use client';

import { useEffect, useRef } from 'react';
import { useTrackEvent } from './useTrackEvent';

/**
 * Fires a FEED_IMPRESSION event once when the element becomes ≥50% visible
 * for at least 1 second — avoids counting rapid scrolls past.
 */
export function useTrackImpression(
    targetId: string,
    targetType: 'product' | 'demand' | 'store',
    metadata?: Record<string, unknown>,
) {
    const ref = useRef<HTMLElement | null>(null);
    const fired = useRef(false);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const track = useTrackEvent();

    useEffect(() => {
        const el = ref.current;
        if (!el || fired.current) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !fired.current) {
                    timer.current = setTimeout(() => {
                        if (!fired.current) {
                            fired.current = true;
                            track('FEED_IMPRESSION', { targetId, targetType, metadata });
                        }
                    }, 1000);
                } else {
                    if (timer.current) {
                        clearTimeout(timer.current);
                        timer.current = null;
                    }
                }
            },
            { threshold: 0.5 },
        );

        observer.observe(el);
        return () => {
            observer.disconnect();
            if (timer.current) clearTimeout(timer.current);
        };
    }, [targetId, targetType, metadata, track]);

    return ref;
}
