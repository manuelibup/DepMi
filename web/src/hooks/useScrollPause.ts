import { useEffect, RefObject } from 'react';

/**
 * Pauses a video element when it scrolls out of the viewport.
 * threshold: fraction of the element that must be visible to stay playing.
 */
export function useScrollPause(
    ref: RefObject<HTMLVideoElement | null>,
    threshold = 0.25,
) {
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => { if (!entry.isIntersecting) el.pause(); },
            { threshold },
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [ref, threshold]);
}
