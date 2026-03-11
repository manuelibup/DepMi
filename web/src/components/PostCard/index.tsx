'use client';

import React, { useState } from 'react';
import Image from 'next/image';
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

export default function PostCard({ data, sessionUserId }: { data: PostData; sessionUserId?: string }) {
    const [liked, setLiked] = useState(data.isLiked ?? false);
    const [likeCount, setLikeCount] = useState(data.likeCount);
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState<{ id: string; text: string; createdAt: string; author: PostAuthor }[]>([]);
    const [commentText, setCommentText] = useState('');
    const [commentLoading, setCommentLoading] = useState(false);
    const [commentsLoaded, setCommentsLoaded] = useState(false);

    const authorName = data.author.displayName || data.author.username || 'Store';
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
            }
        } catch { /* ignore */ } finally {
            setCommentLoading(false);
        }
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
                <div className={styles.avatar}>
                    {data.author.avatarUrl ? (
                        <Image src={data.author.avatarUrl} alt={authorName} fill sizes="36px" style={{ objectFit: 'cover' }} />
                    ) : (
                        <span className={styles.avatarInitial}>{authorInitial}</span>
                    )}
                </div>
                <div className={styles.authorMeta}>
                    <span className={styles.authorName}>{authorName}</span>
                    <span className={styles.time}>{timeAgo(data.createdAt)}</span>
                </div>
            </div>

            {/* Body */}
            <p className={styles.body}>{data.body}</p>

            {/* Images */}
            {data.images.length > 0 && (
                <div className={`${styles.imageGrid} ${styles[`imgGrid${Math.min(data.images.length, 4)}`]}`}>
                    {data.images.slice(0, 4).map((img, i) => (
                        <div key={i} className={styles.imageCell}>
                            <Image src={img.url} alt="" fill sizes="240px" style={{ objectFit: 'cover' }} />
                        </div>
                    ))}
                </div>
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
                    {likeCount > 0 && <span>{likeCount}</span>}
                </button>

                <button type="button" className={styles.actionBtn} onClick={toggleComments}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    {data.commentCount > 0 && <span>{data.commentCount}</span>}
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
