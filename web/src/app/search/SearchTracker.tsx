'use client';

import { useEffect, useRef } from 'react';
import { useTrackEvent } from '@/hooks/useTrackEvent';

export default function SearchTracker({ query }: { query: string }) {
    const track = useTrackEvent();
    const lastTracked = useRef('');

    useEffect(() => {
        if (!query || query === lastTracked.current) return;
        lastTracked.current = query;
        track('SEARCH', { metadata: { q: query } });
    }, [query, track]);

    return null;
}
