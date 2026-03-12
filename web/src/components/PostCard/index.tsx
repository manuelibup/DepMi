'use client';

import React, { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './PostCard.module.css';

export interface PostAuthor {
    displayName: string | null;
    username: string | null;
    avatarUrl: string | null;
}

export interface PostData {
    id: string;
    body: string;
    type: 'POST' | 'ANNOUNCEMENT';
    likeCount: number;
    commentCount: number;
    createdAt: string;
    author: PostAuthor;
    images: { url: string }[];
    isLiked?: boolean;
    storeSlug: string;
}

function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d`;
    return new Date(iso).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' });
}

// ── Media Carousel ────────────────────────────────────────────────────────────

function MediaCarousel({ images }: { images: { url: string }[] }) {
    const [index, setIndex] = useState(0);
    const touchStartX = useRef<number | null>(null);
    const trackRef = useRef<HTMLDivElement>(null);

    const prev = useCallback(() => setIndex(i => Math.max(0, i - 1)), []);
    const next = useCallback(() => setIndex(i => Math.min(images.length - 1, i + 1)), [images.length]);

    function onTouchStart(e: React.TouchEvent) {
        touchStartX.current = e.touches[0].clientX;
    }
    function onTouchEnd(e: React.TouchEvent) {
        if (touchStartX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        touchStartX.current = null;
        if (dx < -40) next();
        else if (dx > 40) prev();
    }

    // Single image — natural aspect ratio, no chrome
    if (images.length === 1) {
        return (
            <div className={styles.singleImage}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={images[0].url}
                    alt=""
                    className={styles.singleImg}
                    loading="lazy"
                />
            </div>
        );
    }

    // Multi-image carousel
    return (
        <div className={styles.carousel}>
            {/* Track */}
            <div
                ref={trackRef}
                className={styles.carouselTrack}
                style={{ transform: `translateX(-${index * 100}%)` }}
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
            >
                {images.map((img, i) => (
                    <div key={i} className={styles.carouselSlide}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={img.url}
                            alt=""
                            className={styles.carouselImg}
                            loading={i === 0 ? 'eager' : 'lazy'}
                        />
                    </div>
                ))}
            </div>

            {/* Counter badge */}
            <div className={styles.counter}>{index + 1} / {images.length}</div>

            {/* Desktop arrow buttons */}
            {index > 0 && (
                <button type="button" className={`${styles.arrow} ${styles.arrowLeft}`} onClick={prev} aria-label="Previous">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
                </button>
            )}
            {index < images.length - 1 && (
                <button type="button" className={`${styles.arrow} ${styles.arrowRight}`} onClick={next} aria-label="Next">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
                </button>
            )}

            {/* Dot indicators */}
            <div className={styles.dots}>
                {images.map((_, i) => (
                    <button
                        key={i}
                        type="button"
                        aria-label={`Go to image ${i + 1}`}
                        className={`${styles.dot} ${i === index ? styles.dotActive : ''}`}
                        onClick={() => setIndex(i)}
                    />
                ))}
            </div>
        </div>
    );
}

// ── PostCard ──────────────────────────────────────────────────────────────────

export default function PostCard({ data, sessionUserId }: { data: PostData; sessionUserId?: string }) {
    const [liked, setLiked] = useState(data.isLiked ?? false);
    const [likeCount, setLikeCount] = useState(data.likeCount);
    const [commentCount, setCommentCount] = useState(data.commentCount);
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState<{ id: string; text: string; createdAt: string; author: PostAuthor }[]>([]);
    const [commentText, setCommentText] = useState('');
    const [commentLoading, setCommentLoading] = useState(false);
    const [commentsLoaded, setCommentsLoaded] = useState(false);
    const [sharecopied, setShareCopied] = useState(false);

    const authorName = data.author.displayName || data.author.username || 'Store';
    const authorHandle = data.author.username ? `@${data.author.username}` : null;
    const authorInitial = authorName.charAt(0).toUpperCase();

    async function toggleLike() {
        if (!sessionUserId) return;
        const wasLiked = liked;
        setLiked(!wasLiked);
        setLikeCount(c => wasLiked ? c - 1 : c + 1);
        try {
            await fetch(`/api/posts/${data.id}/like`, { method: 'POST' });
        } catch {
            setLiked(wasLiked);
            setLikeCount(c => wasLiked ? c + 1 : c - 1);
        }
    }

    async function loadComments() {
        if (commentsLoaded) return;
        try {
            const res = await fetch(`/api/posts/${data.id}/comments`);
            const list = await res.json();
            setComments(list);
            setCommentsLoaded(true);
        } catch { /* ignore */ }
    }

    async function toggleComments() {
        const next = !showComments;
        setShowComments(next);
        if (next) loadComments();
    }

    async function submitComment(e: React.FormEvent) {
        e.preventDefault();
        if (!commentText.trim() || !sessionUserId) return;
        setCommentLoading(true);
        try {
            const res = await fetch(`/api/posts/${data.id}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: commentText.trim() }),
            });
            if (res.ok) {
                const c = await res.json();
                setComments(prev => [...prev, c]);
                setCommentText('');
                setCommentCount(n => n + 1);
            }
        } catch { /* ignore */ } finally {
            setCommentLoading(false);
        }
    }

    function handleShare() {
        const url = `${window.location.origin}/store/${data.storeSlug}`;
        navigator.clipboard.writeText(url).then(() => {
            setShareCopied(true);
            setTimeout(() => setShareCopied(false), 2000);
        });
    }

    return (
        <div className={`${styles.card} ${data.type === 'ANNOUNCEMENT' ? styles.announcement : ''}`}>
            {data.type === 'ANNOUNCEMENT' && (
                <div className={styles.announcementBadge}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l19-9-9 19-2-8-8-2z" /></svg>
                    Announcement
                </div>
            )}

            {/* Author row */}
            <div className={styles.authorRow}>
                <Link href={`/store/${data.storeSlug}`} className={styles.avatarLink}>
                    <div className={styles.avatar}>
                        {data.author.avatarUrl ? (
                            <Image src={data.author.avatarUrl} alt={authorName} fill sizes="36px" style={{ objectFit: 'cover' }} />
                        ) : (
                            <span className={styles.avatarInitial}>{authorInitial}</span>
                        )}
                    </div>
                </Link>
                <div className={styles.authorMeta}>
                    <div className={styles.authorNameRow}>
                        <Link href={`/store/${data.storeSlug}`} className={styles.authorName}>{authorName}</Link>
                        {authorHandle && <span className={styles.authorHandle}>{authorHandle}</span>}
                        <span className={styles.authorDot}>·</span>
                        <span className={styles.time}>{timeAgo(data.createdAt)}</span>
                    </div>
                </div>
            </div>

            {/* Body */}
            <p className={styles.body}>{data.body}</p>

            {/* Images — carousel or single natural-ratio */}
            {data.images.length > 0 && (
                <MediaCarousel images={data.images} />
            )}

            {/* Actions */}
            <div className={styles.actions}>
                <button
                    type="button"
                    className={`${styles.actionBtn} ${liked ? styles.actionBtnLiked : ''}`}
                    onClick={toggleLike}
                    disabled={!sessionUserId}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                    <span>{likeCount}</span>
                </button>

                <button type="button" className={styles.actionBtn} onClick={toggleComments}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    <span>{commentCount}</span>
                </button>

                <button
                    type="button"
                    className={`${styles.actionBtn} ${sharecopied ? styles.actionBtnCopied : ''}`}
                    onClick={handleShare}
                    title={sharecopied ? 'Link copied!' : 'Share post'}
                >
                    {sharecopied ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                        </svg>
                    )}
                </button>
            </div>

            {/* Comments */}
            {showComments && (
                <div className={styles.commentsSection}>
                    {comments.map(c => (
                        <div key={c.id} className={styles.comment}>
                            <span className={styles.commentAuthor}>{c.author.displayName || c.author.username}</span>
                            <span className={styles.commentText}>{c.text}</span>
                        </div>
                    ))}

                    {sessionUserId && (
                        <form onSubmit={submitComment} className={styles.commentForm}>
                            <input
                                type="text"
                                className={styles.commentInput}
                                placeholder="Write a comment..."
                                value={commentText}
                                onChange={e => setCommentText(e.target.value)}
                                maxLength={500}
                            />
                            <button type="submit" className={styles.commentSubmit} disabled={commentLoading || !commentText.trim()}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13" /><path d="M22 2L15 22l-4-9-9-4 20-7z" /></svg>
                            </button>
                        </form>
                    )}
                </div>
            )}
        </div>
    );
}
