'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import DemandCard from '@/components/DemandCard';
import ProductCard from '@/components/ProductCard';
import SuggestedProfiles from '@/components/SuggestedProfiles';
import type { ProductData } from '@/components/ProductCard';
import type { DemandData } from '@/components/DemandCard';

export type FeedItem =
    | { type: 'product'; createdAt: string; data: ProductData }
    | { type: 'demand'; createdAt: string; data: DemandData };

interface TopStore {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    depCount: number;
}

interface Props {
    initialItems: FeedItem[];
    initialProductCursor: string | null;
    initialDemandCursor: string | null;
    category?: string;
    topStores: TopStore[];
}

export default function FeedInfiniteScroll({
    initialItems,
    initialProductCursor,
    initialDemandCursor,
    category,
    topStores,
}: Props) {
    const [items, setItems] = useState<FeedItem[]>(initialItems);
    const [productCursor, setProductCursor] = useState<string | null>(initialProductCursor);
    const [demandCursor, setDemandCursor] = useState<string | null>(initialDemandCursor);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(initialProductCursor !== null || initialDemandCursor !== null);
    const sentinelRef = useRef<HTMLDivElement | null>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);

    const fetchMore = useCallback(async () => {
        if (loading || !hasMore) return;
        setLoading(true);

        try {
            const params = new URLSearchParams({ take: '10' });
            if (productCursor) params.set('productCursor', productCursor);
            if (demandCursor) params.set('demandCursor', demandCursor);
            if (category) params.set('category', category);

            const res = await fetch(`/api/feed?${params}`);
            if (!res.ok) throw new Error('Feed fetch failed');

            const data = await res.json();

            if (data.items.length > 0) {
                setItems(prev => [...prev, ...data.items]);
            }
            setProductCursor(data.nextProductCursor);
            setDemandCursor(data.nextDemandCursor);
            setHasMore(data.hasMore);
        } catch {
            // silent — don't break the feed on network errors
        } finally {
            setLoading(false);
        }
    }, [loading, hasMore, productCursor, demandCursor, category]);

    // Wire up IntersectionObserver on the sentinel div
    useEffect(() => {
        if (observerRef.current) observerRef.current.disconnect();

        observerRef.current = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    fetchMore();
                }
            },
            { rootMargin: '300px' } // start loading 300px before the sentinel is visible
        );

        if (sentinelRef.current) {
            observerRef.current.observe(sentinelRef.current);
        }

        return () => observerRef.current?.disconnect();
    }, [fetchMore]);

    // Re-sync items when category changes (parent re-renders with new initialItems)
    useEffect(() => {
        setItems(initialItems);
        setProductCursor(initialProductCursor);
        setDemandCursor(initialDemandCursor);
        setHasMore(initialProductCursor !== null || initialDemandCursor !== null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [category]);

    return (
        <>
            {items.map((item, index) => {
                let card: React.ReactNode;

                if (item.type === 'demand') {
                    card = <DemandCard key={`d-${item.data.id}-${index}`} data={item.data} index={index} />;
                } else {
                    card = (
                        <div key={`p-${item.data.id}-${index}`} style={{ display: 'block' }}>
                            <ProductCard data={item.data} index={index} />
                        </div>
                    );
                }

                // Inject SuggestedProfiles after the 3rd item
                if (index === 2 && topStores.length > 0) {
                    return (
                        <React.Fragment key={`feed-frag-${index}`}>
                            {card}
                            <SuggestedProfiles stores={topStores} />
                        </React.Fragment>
                    );
                }

                return card;
            })}

            {/* Sentinel — watched by IntersectionObserver */}
            <div ref={sentinelRef} style={{ height: 1 }} />

            {loading && (
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    padding: '24px 0',
                    color: 'var(--text-muted)',
                    fontSize: '0.875rem',
                    gap: '8px',
                    alignItems: 'center',
                }}>
                    <span style={{
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        border: '2px solid var(--card-border)',
                        borderTopColor: 'var(--primary)',
                        display: 'inline-block',
                        animation: 'spin 0.7s linear infinite',
                    }} />
                    Loading more...
                </div>
            )}

            {!hasMore && items.length > 0 && (
                <div style={{
                    textAlign: 'center',
                    padding: '32px 16px',
                    color: 'var(--text-muted)',
                    fontSize: '0.875rem',
                }}>
                    You&apos;re all caught up ✓
                </div>
            )}

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </>
    );
}
