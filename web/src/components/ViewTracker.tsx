'use client';

import { useEffect, useRef } from 'react';

interface Props {
    productId?: string;
    demandId?: string;
}

export default function ViewTracker({ productId, demandId }: Props) {
    const tracked = useRef(false);

    useEffect(() => {
        // Prevent double tracking in dev mode StrictMode
        if (tracked.current) return;
        tracked.current = true;

        const recordView = async () => {
            try {
                await fetch('/api/views/record', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ productId, demandId })
                });
            } catch (err) {
                // Silent fail
            }
        };

        // Delay slightly to ensure it's a real view, not just a blink
        const timer = setTimeout(recordView, 2000);
        return () => clearTimeout(timer);
    }, [productId, demandId]);

    return null;
}
