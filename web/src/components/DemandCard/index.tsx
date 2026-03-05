'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthGate } from '@/context/AuthGate';
import { useSession } from 'next-auth/react';
import styles from './DemandCard.module.css';

export interface DemandData {
    id?: string;
    username?: string;
    user: string;
    initials: string;
    avatarUrl?: string | null;
    timeAgo: string;
    text: string;
    budget: string;
    bids: number;
    urgency?: string;
}

interface DemandCardProps {
    data: DemandData;
    index?: number;
}

export default function DemandCard({ data, index = 0 }: DemandCardProps) {
    const router = useRouter();
    const { openGate } = useAuthGate();
    const { status, data: session } = useSession();
    const [showShare, setShowShare] = useState(false);
    const [copied, setCopied] = useState(false);

    // Close sheet on Escape
    useEffect(() => {
        if (!showShare) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowShare(false); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [showShare]);

    const postUrl = typeof window !== 'undefined' && data.id
        ? `${window.location.origin}/requests/${data.id}`
        : '';

    const isOwn = session?.user?.username === data.username;
    const shortText = data.text.length > 80 ? data.text.slice(0, 80) + '…' : data.text;
    const draftMessage = isOwn
        ? `I'm looking to buy "${shortText}" on DepMi — do you sell it?`
        : `${data.user} is looking to buy "${shortText}" on DepMi — do you sell it?`;
    const sharePayload = encodeURIComponent(`${draftMessage}\n\n${postUrl}`);
    const shareText = encodeURIComponent(draftMessage);
    const shareUrl = encodeURIComponent(postUrl);

    const handleCardClick = () => {
        if (data.id) router.push(`/requests/${data.id}`);
    };

    const handleBid = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (status === 'unauthenticated') {
            openGate('Sign in to bid on requests');
            return;
        }
        if (data.id) router.push(`/requests/${data.id}`);
    };

    const handleComment = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (data.id) router.push(`/requests/${data.id}#discussion`);
    };

    const handleShareOpen = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setShowShare(true);
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
                className={styles.card}
                style={{ animationDelay: `${index * 80}ms`, cursor: data.id ? 'pointer' : undefined }}
                onClick={handleCardClick}
            >
                {/* Header */}
                <div className={styles.header}>
                    <Link
                        href={data.username ? `/u/${data.username}` : '#'}
                        className={styles.userInfo}
                        style={{ textDecoration: 'none' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className={styles.avatar}>
                            {data.avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={data.avatarUrl} alt={data.user} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                            ) : data.initials}
                        </div>
                        <div>
                            <p className={styles.userName}>{data.user}</p>
                            <p className={styles.meta}>Looking for &bull; {data.timeAgo}</p>
                        </div>
                    </Link>
                    <span className={styles.badge}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                        </svg>
                        Demand
                    </span>
                </div>

                {/* Body */}
                <p className={styles.text}>{data.text}</p>

                {/* Budget Bar */}
                <div className={styles.budgetBar}>
                    <div className={styles.budgetLeft}>
                        <span className={styles.budgetLabel}>Budget</span>
                        <strong className={styles.budgetValue}>{data.budget}</strong>
                    </div>
                    {data.urgency && (
                        <span className={styles.urgency}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                            </svg>
                            {data.urgency}
                        </span>
                    )}
                </div>

                {/* Actions */}
                <div className={styles.actions}>
                    <button className={`${styles.actionBtn} ${styles.actionBtnBid}`} onClick={handleBid}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m14.5 12.5-8 8a2.12 2.12 0 0 1-3-3l8-8" />
                            <path d="m16 7 1-5 1.37.68A3 3 0 0 0 19.7 3H21v1.3a3 3 0 0 0 .32 1.33L22 7l-5 1Z" />
                            <path d="m11.5 12.5 2-2" />
                        </svg>
                        Bid
                        {data.bids > 0 && <span className={styles.actionCount}>{data.bids}</span>}
                    </button>

                    <button className={styles.actionBtn} onClick={handleComment}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        Discuss
                    </button>

                    <button className={styles.actionBtn} onClick={handleShareOpen}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                        </svg>
                        Share
                    </button>
                </div>
            </article>

            {/* Share sheet */}
            {showShare && (
                <div
                    className={styles.shareOverlay}
                    onClick={(e) => { e.stopPropagation(); setShowShare(false); }}
                >
                    <div className={styles.shareSheet} onClick={e => e.stopPropagation()}>
                        <div className={styles.sheetHandle} />
                        <p className={styles.sheetTitle}>Share this request?</p>
                        <p className={styles.sheetSubtitle}>Let your network know someone is looking for this.</p>

                        {/* Platform buttons */}
                        <div className={styles.sheetOptions}>
                            <a
                                href={`https://wa.me/?text=${sharePayload}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.sheetOption}
                                onClick={e => e.stopPropagation()}
                            >
                                <span className={styles.sheetIcon} style={{ background: '#25D366' }}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                                    </svg>
                                </span>
                                WhatsApp
                            </a>

                            <a
                                href={`https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.sheetOption}
                                onClick={e => e.stopPropagation()}
                            >
                                <span className={styles.sheetIcon} style={{ background: '#000' }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff">
                                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.912-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                    </svg>
                                </span>
                                X (Twitter)
                            </a>

                            <a
                                href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}&quote=${shareText}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.sheetOption}
                                onClick={e => e.stopPropagation()}
                            >
                                <span className={styles.sheetIcon} style={{ background: '#1877F2' }}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">
                                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                    </svg>
                                </span>
                                Facebook
                            </a>

                            <button
                                className={`${styles.sheetOption} ${copied ? styles.sheetOptionCopied : ''}`}
                                onClick={handleCopyLink}
                            >
                                <span className={styles.sheetIcon} style={{ background: 'var(--bg-elevated)' }}>
                                    {copied ? (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                    ) : (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-main)" strokeWidth="2" strokeLinecap="round">
                                            <rect width="14" height="14" x="8" y="8" rx="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                                        </svg>
                                    )}
                                </span>
                                {copied ? 'Copied!' : 'Copy link'}
                            </button>
                        </div>

                        <button className={styles.sheetCancel} onClick={() => setShowShare(false)}>
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
