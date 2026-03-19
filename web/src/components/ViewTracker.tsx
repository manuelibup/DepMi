'use client';

import { useEffect, useRef } from 'react';
import { useTrackEvent } from '@/hooks/useTrackEvent';

interface Props {
    productId?: string;
    demandId?: string;
    storeId?: string;
}

export default function ViewTracker({ productId, demandId, storeId }: Props) {
    const tracked = useRef(false);
    const track = useTrackEvent();

    useEffect(() => {
        // Prevent double tracking in dev mode StrictMode
        if (tracked.current) return;
        tracked.current = true;

        const recordView = async () => {
            try {
                // Deduplicated view count (existing system)
                if (productId || demandId) {
                    await fetch('/api/views/record', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ productId, demandId }),
                    });
                }
            } catch {
                // Silent fail
            }

            // Behavioral analytics event (fire-and-forget)
            if (productId) track('PRODUCT_VIEW', { targetId: productId, targetType: 'product' });
            else if (demandId) track('DEMAND_VIEW', { targetId: demandId, targetType: 'demand' });
            else if (storeId) track('STORE_VIEW', { targetId: storeId, targetType: 'store' });
        };

        // 2s delay — ensures it's a real view, not just a blink
        const timer = setTimeout(recordView, 2000);
        return () => clearTimeout(timer);
    }, [productId, demandId, storeId, track]);

    return null;
}
