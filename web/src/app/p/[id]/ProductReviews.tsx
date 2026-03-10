'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';

interface ReviewEntry {
    id: string;
    rating: number;
    text: string | null;
    createdAt: string;
    buyer: { displayName: string; avatarUrl: string | null; username: string };
}

function Stars({ rating }: { rating: number }) {
    return (
        <span style={{ display: 'inline-flex', gap: '1px' }}>
            {[1, 2, 3, 4, 5].map(n => (
                <svg key={n} width="13" height="13" viewBox="0 0 24 24">
                    <polygon
                        points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
                        fill={n <= rating ? '#FFD700' : 'transparent'}
                        stroke="#FFD700"
                        strokeWidth="1.5"
                    />
                </svg>
            ))}
        </span>
    );
}

function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    return `${Math.floor(months / 12)}y ago`;
}

export default function ProductReviews({ productId }: { productId: string }) {
    const [reviews, setReviews] = useState<ReviewEntry[]>([]);
    const [avgRating, setAvgRating] = useState(0);
    const [count, setCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/reviews?productId=${productId}`)
            .then(r => r.json())
            .then(data => {
                setReviews(data.reviews ?? []);
                setAvgRating(data.avgRating ?? 0);
                setCount(data.count ?? 0);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [productId]);

    if (loading) return null;

    return (
        <div>
            {/* Section header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Buyer Reviews
                </p>
                {count > 0 && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({count})</span>
                )}
            </div>

            {count === 0 ? (
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
                    No reviews yet — be the first after your purchase.
                </p>
            ) : (
                <>
                    {/* Summary bar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', borderRadius: '12px', background: 'var(--card-bg)', border: '1px solid var(--card-border)', marginBottom: '16px' }}>
                        <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1 }}>{avgRating.toFixed(1)}</span>
                        <div>
                            <Stars rating={Math.round(avgRating)} />
                            <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{count} verified purchase{count !== 1 ? 's' : ''}</p>
                        </div>
                    </div>

                    {/* Review list */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {reviews.map(rv => (
                            <div key={rv.id} style={{ padding: '14px 16px', borderRadius: '12px', background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: rv.text ? '8px' : '0' }}>
                                    <div style={{ width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', position: 'relative', flexShrink: 0, background: 'var(--bg-elevated)', border: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {rv.buyer.avatarUrl
                                            ? <Image src={rv.buyer.avatarUrl} alt={rv.buyer.displayName} fill style={{ objectFit: 'cover' }} sizes="32px" />
                                            : <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)' }}>{rv.buyer.displayName.charAt(0).toUpperCase()}</span>
                                        }
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                            <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-main)' }}>{rv.buyer.displayName}</span>
                                            <Stars rating={rv.rating} />
                                        </div>
                                    </div>
                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', flexShrink: 0 }}>{timeAgo(rv.createdAt)}</span>
                                </div>
                                {rv.text && (
                                    <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5, paddingLeft: '42px' }}>
                                        {rv.text}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
