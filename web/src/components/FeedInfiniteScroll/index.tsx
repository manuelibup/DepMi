'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import DemandCard from '@/components/DemandCard';
import DemandCardGrid from '@/components/DemandCardGrid';
import ProductCard from '@/components/ProductCard';
import ProductCardGrid from '@/components/ProductCardGrid';
import PostCard from '@/components/PostCard';
import SuggestedProfiles from '@/components/SuggestedProfiles';
import FeedCarousel from '@/components/FeedCarousel';
import type { ProductData } from '@/components/ProductCard';
import type { DemandData } from '@/components/DemandCard';
import type { PostData } from '@/components/PostCard';

export type FeedItem =
    | { type: 'product'; createdAt: string; data: ProductData }
    | { type: 'demand'; createdAt: string; data: DemandData }
    | { type: 'post'; createdAt: string; data: PostData };

type ViewMode = 'list' | 'grid';
type SortMode = 'new' | 'popular';

interface TopStore {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    depCount: number;
}

interface Props {
    initialItems: FeedItem[];
    initialCursor: string | null;
    category?: string;
    sort?: string;
    topStores: TopStore[];
    sessionUserId?: string;
}

const STORAGE_KEY = 'depmi_feed_view';

export default function FeedInfiniteScroll({
    initialItems,
    initialCursor,
    category,
    sort,
    topStores,
    sessionUserId,
}: Props) {
    const [items, setItems] = useState<FeedItem[]>(initialItems);
    const [cursor, setCursor] = useState<string | null>(initialCursor);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(initialCursor !== null);
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [sortMode, setSortMode] = useState<SortMode>('new');
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
            const params = new URLSearchParams({ take: '20' });
            if (cursor) params.set('cursor', cursor);
            if (category) params.set('category', category);
            if (sort) params.set('sort', sort);

            const res = await fetch(`/api/feed?${params}`);
            if (!res.ok) throw new Error('Feed fetch failed');

            const data = await res.json();

            if (data.items.length > 0) {
                setItems(prev => [...prev, ...data.items]);
            }
            setCursor(data.nextCursor);
            setHasMore(data.hasMore);
        } catch {
            // silent — don't break the feed on network errors
        } finally {
            setLoading(false);
        }
    }, [loading, hasMore, cursor, category, sort]);

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
        setCursor(initialCursor);
        setHasMore(initialCursor !== null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [category]);

    const isGrid = viewMode === 'grid';

    const sortedItems = sortMode === 'popular'
        ? [...items].sort((a, b) => {
            const viewsA = a.type === 'demand' ? (a.data.viewCount ?? 0) : a.type === 'product' ? (a.data.viewers ?? 0) : 0;
            const viewsB = b.type === 'demand' ? (b.data.viewCount ?? 0) : b.type === 'product' ? (b.data.viewers ?? 0) : 0;
            const scoreA = (a.data.likeCount ?? 0) + viewsA;
            const scoreB = (b.data.likeCount ?? 0) + viewsB;
            return scoreB - scoreA;
        })
        : items;

    return (
        <>
            {/* Toolbar: sort pills (left) + view toggle (right) */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 8,
                marginBottom: 4,
            }}>
                {/* Sort pills */}
                <div style={{ display: 'flex', gap: 4 }}>
                    {(['new', 'popular'] as SortMode[]).map(mode => (
                        <button
                            key={mode}
                            onClick={() => setSortMode(mode)}
                            style={{
                                padding: '5px 12px',
                                borderRadius: 20,
                                border: '1px solid',
                                borderColor: sortMode === mode ? 'var(--primary)' : 'var(--card-border)',
                                background: sortMode === mode ? 'rgba(var(--primary-rgb),0.12)' : 'transparent',
                                color: sortMode === mode ? 'var(--primary)' : 'var(--text-muted)',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                            }}
                        >
                            {mode === 'new' ? 'Newest' : 'Popular'}
                        </button>
                    ))}
                </div>
                {/* View toggle buttons */}
                <div style={{ display: 'flex', gap: 4 }}>
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
                {/* end view toggle */}
                </div>
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
                {sortedItems.map((item, index) => {
                    const fullWidth = isGrid ? { gridColumn: '1 / -1' } : {};

                    let card: React.ReactNode;

                    if (item.type === 'post') {
                        // Posts always render full-width regardless of view mode
                        card = (
                            <div key={`post-${item.data.id}-${index}`} style={fullWidth}>
                                <PostCard data={item.data} sessionUserId={sessionUserId} />
                            </div>
                        );
                    } else if (item.type === 'demand') {
                        card = isGrid ? (
                            <DemandCardGrid key={`dg-${item.data.id}-${index}`} data={item.data} index={index} />
                        ) : (
                            <div key={`d-${item.data.id}-${index}`}>
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
