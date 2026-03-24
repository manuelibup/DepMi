'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthGate } from '@/context/AuthGate';
import { useSession } from 'next-auth/react';
import styles from './ProductCard.module.css';
import { useTrackImpression } from '@/hooks/useTrackImpression';
import { useTrackEvent } from '@/hooks/useTrackEvent';
import { cloudinaryTransform } from '@/lib/cloudinary';

export interface ProductData {
    store: string;
    storeSlug: string;
    storeInitial: string;
    storeColor: string;
    logoUrl?: string | null;
    deps: number;
    depTier: string;
    title: string;
    price: string;
    location: string;
    image: string;
    images?: string[];
    viewers?: number;
    id?: string;
    ownerId?: string;
    ownerUsername?: string;
    isLiked?: boolean;
    isSaved?: boolean;
    likeCount?: number;
    saveCount?: number;
    commentCount?: number;
    stock?: number;
    inStock?: boolean;
}

interface ProductCardProps {
    data: ProductData;
    index?: number;
}

function NotifyMeButton({ productId }: { productId?: string }) {
    const { openGate } = useAuthGate();
    const { status } = useSession();
    const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle');

    const handleClick = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (status === 'unauthenticated') { openGate(); return; }
        if (!productId || state !== 'idle') return;
        setState('loading');
        try {
            await fetch('/api/product-watch/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId }),
            });
            setState('done');
        } catch { setState('idle'); }
    };

    if (state === 'done') {
        return <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#00B894' }}>✓ We&apos;ll notify you!</span>;
    }
    return (
        <button
            onClick={handleClick}
            disabled={state === 'loading'}
            style={{
                flex: 1, background: 'var(--bg-elevated)', border: '1px solid var(--card-border)',
                color: 'var(--text-main)', borderRadius: 8, padding: '9px 12px',
                fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', opacity: state === 'loading' ? 0.7 : 1,
            }}
        >
            🔔 {state === 'loading' ? 'Saving…' : 'Notify Me When Available'}
        </button>
    );
}

function getDepLabel(tier: string): string {
    switch (tier) {
        case 'seedling': return '🌱';
        case 'rising': return '⭐';
        case 'trusted': return '🔥';
        case 'elite': return '💎';
        case 'legend': return '🏆';
        default: return '⭐';
    }
}

function haptic(ms = 8) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(ms);
}

function ImageCarousel({ images, title, inStock, stock }: {
    images: string[];
    title: string;
    inStock?: boolean;
    stock?: number;
}) {
    const [idx, setIdx] = useState(0);
    const touchStartX = useRef<number | null>(null);
    const touchStartY = useRef<number | null>(null);

    const goTo = useCallback((next: number, e?: React.MouseEvent) => {
        e?.preventDefault(); e?.stopPropagation();
        setIdx(Math.max(0, Math.min(next, images.length - 1)));
    }, [images.length]);

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartX.current === null || touchStartY.current === null) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
        // Only trigger on horizontal swipes, ignore vertical scrolls
        if (Math.abs(dx) > 40 && Math.abs(dx) > dy) {
            dx < 0 ? goTo(idx + 1) : goTo(idx - 1);
        }
        touchStartX.current = null;
        touchStartY.current = null;
    };

    if (!images.length) {
        return (
            <div className={styles.imagePlaceholder}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect width="18" height="18" x="3" y="3" rx="2" /><circle cx="9" cy="9" r="2" />
                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                </svg>
            </div>
        );
    }

    return (
        <div
            className={styles.carousel}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onClick={e => e.stopPropagation()}
        >
            {/* Sliding track — all images rendered so browser preloads them */}
            <div
                className={styles.carouselTrack}
                style={{ transform: `translateX(-${idx * 100}%)` }}
            >
                {images.map((src, i) => (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                        key={src}
                        src={cloudinaryTransform(src, 800)}
                        alt={i === 0 ? title : ''}
                        className={styles.carouselImg}
                        width={800}
                        height={800}
                        loading={i === 0 ? 'eager' : 'lazy'}
                        fetchPriority={i === 0 ? 'high' : 'auto'}
                        draggable={false}
                    />
                ))}
            </div>

            {/* Prev / Next arrows — only show when multiple images */}
            {images.length > 1 && idx > 0 && (
                <button className={`${styles.carouselArrow} ${styles.carouselArrowPrev}`} onClick={e => goTo(idx - 1, e)} aria-label="Previous image">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
                </button>
            )}
            {images.length > 1 && idx < images.length - 1 && (
                <button className={`${styles.carouselArrow} ${styles.carouselArrowNext}`} onClick={e => goTo(idx + 1, e)} aria-label="Next image">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
                </button>
            )}

            {/* Dot indicators */}
            {images.length > 1 && (
                <div className={styles.carouselDots}>
                    {images.map((_, i) => (
                        <button
                            key={i}
                            className={`${styles.dot} ${i === idx ? styles.dotActive : ''}`}
                            onClick={e => goTo(i, e)}
                            aria-label={`Image ${i + 1}`}
                        />
                    ))}
                </div>
            )}

            {/* Stock badges */}
            {inStock === false && (
                <div className={styles.stockBadge} style={{ background: 'var(--error)' }}>Out of Stock</div>
            )}
            {inStock !== false && typeof stock === 'number' && stock > 0 && (
                <div className={styles.stockBadge}>{stock} Left</div>
            )}
        </div>
    );
}

export default function ProductCard({ data, index = 0 }: ProductCardProps) {
    const { openGate } = useAuthGate();
    const { status } = useSession();
    const router = useRouter();

    const impressionRef = useTrackImpression(data.id ?? '', 'product', { index });
    const track = useTrackEvent();

    const [liked, setLiked] = useState<boolean>(data.isLiked || false);
    const [saved, setSaved] = useState<boolean>(data.isSaved || false);
    const [likeCount, setLikeCount] = useState<number>(data.likeCount ?? 0);
    const [showShare, setShowShare] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        setLiked(data.isLiked || false);
        setSaved(data.isSaved || false);
        setLikeCount(data.likeCount ?? 0);
    }, [data.isLiked, data.isSaved, data.likeCount]);

    useEffect(() => {
        if (!showShare) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowShare(false); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [showShare]);

    const postUrl = typeof window !== 'undefined' && data.id
        ? `${window.location.origin}/p/${data.id}`
        : '';
    const shareText = encodeURIComponent(`Check out ${data.title} for ${data.price} by ${data.store} on DepMi`);
    const sharePayload = encodeURIComponent(`${decodeURIComponent(shareText)}\n\n${postUrl}`);
    const shareUrl = encodeURIComponent(postUrl);

    const handleLike = async (e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation();
        if (status === 'unauthenticated') { openGate(); return; }
        haptic();
        const next = !liked;
        setLiked(next);
        setLikeCount(c => next ? c + 1 : Math.max(0, c - 1));
        if (data.id) {
            if (next) track('LIKE', { targetId: data.id, targetType: 'product' });
            try {
                const res = await fetch(`/api/products/${data.id}/like`, { method: 'POST' });
                if (!res.ok) throw new Error();
            } catch {
                setLiked(!next);
                setLikeCount(c => next ? Math.max(0, c - 1) : c + 1);
            }
        }
    };

    const handleSave = async (e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation();
        if (status === 'unauthenticated') { openGate(); return; }
        haptic();
        const next = !saved;
        setSaved(next);
        if (data.id) {
            if (next) track('SAVE', { targetId: data.id, targetType: 'product' });
            try {
                const res = await fetch(`/api/products/${data.id}/save`, { method: 'POST' });
                if (!res.ok) throw new Error();
            } catch {
                setSaved(!next);
            }
        }
    };

    const handleComment = (e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation();
        if (data.id) router.push(`/p/${data.id}`);
    };

    const handleAction = async (e: React.MouseEvent, action: string) => {
        e.preventDefault(); e.stopPropagation();
        if (status === 'unauthenticated') { openGate(); return; }
        if (action === 'buy' && data.id) {
            router.push(`/checkout/${data.id}`);
        } else if (action === 'chat' && data.ownerId) {
            try {
                const res = await fetch('/api/messages/new', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: data.ownerId }),
                });
                const result = await res.json();
                if (result.conversationId) router.push(`/messages/${result.conversationId}`);
            } catch (err) {
                console.error('Failed to start chat:', err);
            }
        }
    };

    const handleCopyLink = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(postUrl).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <>
            <article
                ref={impressionRef as React.RefObject<HTMLElement>}
                className={styles.card}
                style={{ animationDelay: `${index * 80 + 100}ms` }}
                onClick={() => data.id && router.push(`/p/${data.id}`)}
            >
                {/* ── Header — identical layout to PostCard ── */}
                <div className={styles.header}>
                    <Link
                        href={`/store/${data.storeSlug}`}
                        className={styles.avatarLink}
                        aria-label={`Visit ${data.store} store`}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className={styles.avatar} style={{ background: data.logoUrl ? 'transparent' : data.storeColor }}>
                            {data.logoUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={cloudinaryTransform(data.logoUrl, 128)}
                                    alt={data.store}
                                    width={36}
                                    height={36}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                                />
                            ) : (
                                <span className={styles.avatarInitial}>{data.storeInitial}</span>
                            )}
                        </div>
                    </Link>
                    <div className={styles.authorMeta}>
                        <div className={styles.authorNameRow}>
                            <Link
                                href={`/store/${data.storeSlug}`}
                                className={styles.authorName}
                                onClick={e => e.stopPropagation()}
                            >
                                {data.store}
                            </Link>
                            {data.ownerUsername && (
                                <span className={styles.authorHandle}>@{data.ownerUsername}</span>
                            )}
                        </div>
                        <div className={styles.authorSub}>
                            <span className={styles.depsBadge}>
                                {getDepLabel(data.depTier)} {data.deps} Deps
                            </span>
                        </div>
                    </div>
                </div>

                {/* ── Image carousel ── */}
                <ImageCarousel
                    images={data.images?.length ? data.images : (data.image ? [data.image] : [])}
                    title={data.title}
                    inStock={data.inStock}
                    stock={data.stock}
                />

                {/* ── Product info ── */}
                <div className={styles.body}>
                    <div className={styles.titleRow}>
                        {/* Link gives Google a real anchor to follow from the feed */}
                        <Link
                            href={`/p/${data.id}`}
                            className={styles.title}
                            style={{ textDecoration: 'none' }}
                            onClick={e => e.stopPropagation()}
                        >
                            {data.title}
                        </Link>
                        <span className={styles.price}>{data.price}</span>
                    </div>
                    <p className={styles.location}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                        </svg>
                        {data.location}
                    </p>

                    {/* CTA — part of the content body, not a separate action bar */}
                    <div className={styles.cta}>
                        {data.inStock === false ? (
                            <NotifyMeButton productId={data.id} />
                        ) : (
                            <>
                                <button className={styles.buyBtn} onClick={e => handleAction(e, 'buy')}>
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" />
                                    </svg>
                                    Buy via Escrow
                                </button>
                                <button className={styles.chatBtn} onClick={e => handleAction(e, 'chat')}>
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                    </svg>
                                    Chat
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* ── Unified action bar — same structure as PostCard ── */}
                <div className={styles.actions}>
                    <button
                        type="button"
                        className={styles.actionBtn}
                        onClick={handleComment}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        <span>{data.commentCount ?? 0}</span>
                    </button>

                    <button
                        type="button"
                        className={`${styles.actionBtn} ${liked ? styles.actionBtnLiked : ''}`}
                        onClick={handleLike}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24"
                            fill={liked ? 'currentColor' : 'none'}
                            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                        <span>{likeCount}</span>
                    </button>

                    {(data.viewers ?? 0) >= 0 && (
                        <span className={styles.viewCount}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                            </svg>
                            {data.viewers ?? 0}
                        </span>
                    )}

                    <button
                        type="button"
                        className={styles.actionBtn}
                        onClick={e => { e.preventDefault(); e.stopPropagation(); setShowShare(true); if (data.id) track('SHARE', { targetId: data.id, targetType: 'product' }); }}
                        aria-label="Share"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                        </svg>
                    </button>

                    {/* Save — pushed to far right like bookmark on X/Instagram */}
                    <button
                        type="button"
                        className={`${styles.actionBtn} ${styles.actionBtnSave} ${saved ? styles.actionBtnSaved : ''}`}
                        onClick={handleSave}
                        aria-label="Save"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24"
                            fill={saved ? 'currentColor' : 'none'}
                            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                        </svg>
                        {(data.saveCount ?? 0) > 0 && <span>{data.saveCount}</span>}
                    </button>
                </div>
            </article>

            {/* Share sheet */}
            {showShare && (
                <div
                    className={styles.shareOverlay}
                    onClick={e => { e.stopPropagation(); setShowShare(false); }}
                >
                    <div className={styles.shareSheet} onClick={e => e.stopPropagation()}>
                        <div className={styles.sheetHandle} />
                        <p className={styles.sheetTitle}>Share this product</p>
                        <p className={styles.sheetSubtitle}>Send this item to your network or friends.</p>
                        <div className={styles.sheetOptions}>
                            <a href={`https://wa.me/?text=${sharePayload}`} target="_blank" rel="noopener noreferrer" className={styles.sheetOption} onClick={e => e.stopPropagation()}>
                                <span className={styles.sheetIcon} style={{ background: '#25D366' }}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" /></svg>
                                </span>
                                WhatsApp
                            </a>
                            <a href={`https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`} target="_blank" rel="noopener noreferrer" className={styles.sheetOption} onClick={e => e.stopPropagation()}>
                                <span className={styles.sheetIcon} style={{ background: '#000' }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.912-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                                </span>
                                X (Twitter)
                            </a>
                            <a href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}&quote=${shareText}`} target="_blank" rel="noopener noreferrer" className={styles.sheetOption} onClick={e => e.stopPropagation()}>
                                <span className={styles.sheetIcon} style={{ background: '#1877F2' }}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                                </span>
                                Facebook
                            </a>
                            <button className={`${styles.sheetOption} ${copied ? styles.sheetOptionCopied : ''}`} onClick={handleCopyLink}>
                                <span className={styles.sheetIcon} style={{ background: 'var(--bg-elevated)' }}>
                                    {copied ? (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                                    ) : (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-main)" strokeWidth="2" strokeLinecap="round"><rect width="14" height="14" x="8" y="8" rx="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
                                    )}
                                </span>
                                {copied ? 'Copied!' : 'Copy link'}
                            </button>
                        </div>
                        <button className={styles.sheetCancel} onClick={() => setShowShare(false)}>Cancel</button>
                    </div>
                </div>
            )}
        </>
    );
}
