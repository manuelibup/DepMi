'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useAuthGate } from '@/context/AuthGate';
import styles from './RequestDetail.module.css';

interface Props {
    demandId: string;
    initialLiked: boolean;
    initialSaved: boolean;
    initialLikeCount: number;
    commentCount: number;
    viewCount: number;
    isLoggedIn: boolean;
}

export default function DemandDetailActions({
    demandId,
    initialLiked,
    initialSaved,
    initialLikeCount,
    commentCount,
    viewCount,
    isLoggedIn,
}: Props) {
    const { status } = useSession();
    const { openGate } = useAuthGate();

    const [liked, setLiked] = useState(initialLiked);
    const [likeCount, setLikeCount] = useState(initialLikeCount);
    const [saved, setSaved] = useState(initialSaved);
    const [showShare, setShowShare] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        setLiked(initialLiked);
        setLikeCount(initialLikeCount);
        setSaved(initialSaved);
    }, [initialLiked, initialLikeCount, initialSaved]);

    const handleLike = async () => {
        if (status === 'unauthenticated') { openGate(); return; }
        const next = !liked;
        setLiked(next);
        setLikeCount(c => c + (next ? 1 : -1));
        const res = await fetch(`/api/demands/${demandId}/like`, { method: 'POST' });
        if (!res.ok) {
            setLiked(!next);
            setLikeCount(c => c + (next ? -1 : 1));
        }
    };

    const handleSave = async () => {
        if (status === 'unauthenticated') { openGate(); return; }
        const next = !saved;
        setSaved(next);
        const res = await fetch(`/api/demands/${demandId}/save`, { method: 'POST' });
        if (!res.ok) setSaved(!next);
    };

    const handleShare = () => {
        setShowShare(v => !v);
    };

    const copyLink = async () => {
        const url = window.location.href;
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => { setCopied(false); setShowShare(false); }, 1500);
        } catch {
            setShowShare(false);
        }
    };

    const scrollToComments = () => {
        document.querySelector('[data-comments-section]')?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className={styles.detailActions}>
            {/* Like */}
            <button
                type="button"
                className={`${styles.detailActionBtn} ${liked ? styles.detailActionBtnLiked : ''}`}
                onClick={handleLike}
                aria-label="Like"
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                <span>{likeCount > 0 ? likeCount : ''}</span>
            </button>

            {/* Comment */}
            <button
                type="button"
                className={styles.detailActionBtn}
                onClick={scrollToComments}
                aria-label="Comments"
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <span>{commentCount > 0 ? commentCount : ''}</span>
            </button>

            {/* Bookmark */}
            <button
                type="button"
                className={`${styles.detailActionBtn} ${saved ? styles.detailActionBtnSaved : ''}`}
                onClick={handleSave}
                aria-label="Bookmark"
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </svg>
            </button>

            {/* View count */}
            <span className={styles.detailViewCount}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                </svg>
                {(viewCount + 1).toLocaleString()}
            </span>

            {/* Share */}
            <div style={{ position: 'relative', marginLeft: 'auto' }}>
                <button
                    type="button"
                    className={styles.detailActionBtn}
                    onClick={handleShare}
                    aria-label="Share"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                    </svg>
                </button>
                {showShare && (
                    <div className={styles.sharePopup}>
                        <button type="button" className={styles.shareOption} onClick={copyLink}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                            {copied ? 'Copied!' : 'Copy link'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
