'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import DemandCard from '@/components/DemandCard';
import ProductCard from '@/components/ProductCard';
import ProductCardGrid from '@/components/ProductCardGrid';
import SuggestedProfiles from '@/components/SuggestedProfiles';
import FeedCarousel from '@/components/FeedCarousel';
import type { ProductData } from '@/components/ProductCard';
import type { DemandData } from '@/components/DemandCard';

export type FeedItem =
    | { type: 'product'; createdAt: string; data: ProductData }
    | { type: 'demand'; createdAt: string; data: DemandData };

type ViewMode = 'list' | 'grid';

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

const STORAGE_KEY = 'depmi_feed_view';

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
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const sentinelRef = useRef<HTMLDivElement | null>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);

    // Restore persisted view mode
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY) as ViewMode | null;
            if (stored === 'grid' || stored === 'list') setViewMode(stored);
        } catch { /* ignore */ }
    }, []);

    const setView = (mode: ViewMode) => {
        setViewMode(mode);
        try { localStorage.setItem(STORAGE_KEY, mode); } catch { /* ignore */ }
    };

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

    useEffect(() => {
        if (observerRef.current) observerRef.current.disconnect();

        observerRef.current = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) fetchMore();
            },
            { rootMargin: '300px' },
        );

        if (sentinelRef.current) observerRef.current.observe(sentinelRef.current);
        return () => observerRef.current?.disconnect();
    }, [fetchMore]);

    // Re-sync on category change
    useEffect(() => {
        setItems(initialItems);
        setProductCursor(initialProductCursor);
        setDemandCursor(initialDemandCursor);
        setHasMore(initialProductCursor !== null || initialDemandCursor !== null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [category]);

    const isGrid = viewMode === 'grid';

    return (
        <>
            {/* View toggle */}
            <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: 4,
                marginBottom: 4,
            }}>
                <button
                    onClick={() => setView('list')}
                    aria-label="List view"
                    style={{
                        padding: '6px 8px',
                        borderRadius: 8,
                        border: 'none',
                        background: !isGrid ? 'var(--primary)' : 'var(--bg-elevated)',
                        color: !isGrid ? '#fff' : 'var(--text-muted)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        transition: 'background 0.15s, color 0.15s',
                    }}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="3" y1="6" x2="21" y2="6" />
                        <line x1="3" y1="12" x2="21" y2="12" />
                        <line x1="3" y1="18" x2="21" y2="18" />
                    </svg>
                </button>
                <button
                    onClick={() => setView('grid')}
                    aria-label="Grid view"
                    style={{
                        padding: '6px 8px',
                        borderRadius: 8,
                        border: 'none',
                        background: isGrid ? 'var(--primary)' : 'var(--bg-elevated)',
                        color: isGrid ? '#fff' : 'var(--text-muted)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        transition: 'background 0.15s, color 0.15s',
                    }}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <rect x="3" y="3" width="7" height="7" rx="1" />
                        <rect x="14" y="3" width="7" height="7" rx="1" />
                        <rect x="3" y="14" width="7" height="7" rx="1" />
                        <rect x="14" y="14" width="7" height="7" rx="1" />
                    </svg>
                </button>
            </div>

            {/* Feed */}
            <div style={isGrid ? {
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
            } : {
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
            }}>
                {items.map((item, index) => {
                    const fullWidth = isGrid ? { gridColumn: '1 / -1' } : {};

                    let card: React.ReactNode;

                    if (item.type === 'demand') {
                        card = (
                            <div key={`d-${item.data.id}-${index}`} style={fullWidth}>
                                <DemandCard data={item.data} index={index} />
                            </div>
                        );
                    } else {
                        card = isGrid ? (
                            <ProductCardGrid key={`pg-${item.data.id}-${index}`} data={item.data} index={index} />
                        ) : (
                            <div key={`p-${item.data.id}-${index}`}>
                                <ProductCard data={item.data} index={index} />
                            </div>
                        );
                    }

                    // Inject SuggestedProfiles after the 3rd item
                    if (index === 2 && topStores.length > 0) {
                        return (
                            <React.Fragment key={`feed-frag-sg-${index}`}>
                                {card}
                                <div style={fullWidth}>
                                    <SuggestedProfiles stores={topStores} />
                                </div>
                            </React.Fragment>
                        );
                    }

                    // Inject Trending carousel after the 8th item
                    if (index === 7) {
                        return (
                            <React.Fragment key={`feed-frag-car-${index}`}>
                                {card}
                                <div style={fullWidth}>
                                    <FeedCarousel />
                                </div>
                            </React.Fragment>
                        );
                    }

                    return card;
                })}
            </div>

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
