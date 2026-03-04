'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuthGate } from '@/context/AuthGate';
import { useSession } from 'next-auth/react';
import styles from './ProductCard.module.css';

export interface ProductData {
    store: string;
    storeInitial: string;
    storeColor: string;
    deps: number;
    depTier: string;
    title: string;
    price: string;
    location: string;
    image: string;
    viewers?: number;
    id?: string;
}

interface ProductCardProps {
    data: ProductData;
    index?: number;
}

function getDepIcon(tier: string): string {
    switch (tier) {
        case 'seedling': return '🌱';
        case 'rising': return '⭐';
        case 'trusted': return '🔥';
        case 'elite': return '💎';
        case 'legend': return '🏆';
        default: return '⭐';
    }
}

export default function ProductCard({ data, index = 0 }: ProductCardProps) {
    const { openGate } = useAuthGate();
    const { status } = useSession();
    const router = useRouter();

    const likeKey = `liked_${data.id}`;
    const saveKey = `saved_${data.id}`;
    const [liked, setLiked] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (data.id) {
            setLiked(localStorage.getItem(likeKey) === '1');
            setSaved(localStorage.getItem(saveKey) === '1');
        }
    }, [data.id, likeKey, saveKey]);

    const handleLike = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (status === 'unauthenticated') { openGate(); return; }
        const next = !liked;
        setLiked(next);
        if (data.id) localStorage.setItem(likeKey, next ? '1' : '0');
    };

    const handleSave = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (status === 'unauthenticated') { openGate(); return; }
        const next = !saved;
        setSaved(next);
        if (data.id) localStorage.setItem(saveKey, next ? '1' : '0');
    };

    const handleShare = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const url = data.id ? `${window.location.origin}/p/${data.id}` : window.location.href;
        if (navigator.share) {
            navigator.share({ title: data.title, text: `${data.price} · ${data.store}`, url });
        } else {
            navigator.clipboard.writeText(url);
        }
    };

    const handleComment = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (data.id) router.push(`/p/${data.id}`);
    };

    const handleAction = (e: React.MouseEvent, action: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (status === 'unauthenticated') { openGate(); return; }
        if (action === 'buy' && data.id) router.push(`/checkout/${data.id}`);
    };

    const handleCardClick = () => {
        if (data.id) router.push(`/p/${data.id}`);
    };

    return (
        <article
            className={styles.card}
            style={{ animationDelay: `${index * 80 + 100}ms` }}
            onClick={handleCardClick}
        >
            {/* Store Header */}
            <div className={styles.header}>
                <div className={styles.storeInfo}>
                    <div className={styles.storeAvatar} style={{ background: data.storeColor }}>
                        {data.storeInitial}
                    </div>
                    <div>
                        <p className={styles.storeName}>{data.store}</p>
                        <div className={styles.depsBadge}>
                            <span>{getDepIcon(data.depTier)}</span>
                            <span>{data.deps} Deps</span>
                        </div>
                    </div>
                </div>
                <button className={styles.moreBtn} aria-label="More options">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" />
                    </svg>
                </button>
            </div>

            {/* Product Image */}
            <div className={styles.imageWrap}>
                {data.image ? (
                    <Image
                        src={data.image}
                        alt={data.title}
                        width={440}
                        height={280}
                        className={styles.productImage}
                    />
                ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect width="18" height="18" x="3" y="3" rx="2" />
                            <circle cx="9" cy="9" r="2" />
                            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                        </svg>
                    </div>
                )}
                {data.viewers && data.viewers > 0 && (
                    <div className={styles.viewersBadge}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                        </svg>
                        {data.viewers} viewing
                    </div>
                )}
            </div>

            {/* Product Info */}
            <div className={styles.info}>
                <div className={styles.titleRow}>
                    <h3 className={styles.title}>{data.title}</h3>
                    <p className={styles.price}>{data.price}</p>
                </div>
                <p className={styles.location}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                    </svg>
                    {data.location}
                </p>
            </div>

            {/* Social Actions */}
            <div className={styles.social}>
                <button className={styles.socialBtn} aria-label="Like" onClick={handleLike}
                    style={{ color: liked ? '#E53935' : undefined }}>
                    <svg width="20" height="20" viewBox="0 0 24 24"
                        fill={liked ? '#E53935' : 'none'}
                        stroke={liked ? '#E53935' : 'currentColor'}
                        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                </button>
                <button className={styles.socialBtn} aria-label="Comment" onClick={handleComment}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                </button>
                <button className={styles.socialBtn} aria-label="Share" onClick={handleShare}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                    </svg>
                </button>
                <button className={`${styles.socialBtn} ${styles.saveBtn}`} aria-label="Save" onClick={handleSave}
                    style={{ color: saved ? 'var(--primary)' : undefined }}>
                    <svg width="20" height="20" viewBox="0 0 24 24"
                        fill={saved ? 'var(--primary)' : 'none'}
                        stroke={saved ? 'var(--primary)' : 'currentColor'}
                        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                    </svg>
                </button>
            </div>

            {/* CTA */}
            <div className={styles.actions}>
                <button className={styles.buyBtn} onClick={(e) => handleAction(e, 'buy')}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" />
                    </svg>
                    Buy via Escrow
                </button>
                <button className={styles.chatBtn} onClick={(e) => handleAction(e, 'chat')}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    Chat
                </button>
            </div>
        </article>
    );
}
