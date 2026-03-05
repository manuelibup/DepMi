'use client';

import React, { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useAuthGate } from '@/context/AuthGate';
import styles from './RequestDetail.module.css';

interface CommentItem {
    id: string;
    text: string;
    author: { displayName: string; username?: string | null };
    createdAt: string;
}

interface ProductResult {
    id: string;
    title: string;
    price: number;
    storeName: string;
}

// Renders comment text and turns [Title](/p/id) into styled product link chips
// AND turns @username into stylized mention link
function CommentText({ text }: { text: string }) {
    const combinedRegex = /(\[([^\]]+)\]\(\/p\/([^)]+)\))|(@[a-zA-Z0-9_]+)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = combinedRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push(text.slice(lastIndex, match.index));
        }

        if (match[1]) {
            // Product match
            parts.push(
                <Link key={match.index} href={`/p/${match[3]}`} className={styles.productMention}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <path d="m3 9 18-6" />
                    </svg>
                    {match[2]}
                </Link>
            );
        } else if (match[4]) {
            // User match
            const username = match[4].substring(1);
            parts.push(
                <Link key={match.index} href={`/u/${username}`} className={styles.userMention}>
                    {match[4]}
                </Link>
            );
        }
        
        lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) parts.push(text.slice(lastIndex));
    return <>{parts}</>;
}

function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}

export default function CommentSection({
    apiPath,
    initialComments,
    canComment,
    isLoggedIn,
    showTitle = true,
}: {
    apiPath: string; // e.g. /api/demands/[id]/comments or /api/products/[id]/comments
    initialComments: CommentItem[];
    canComment: boolean;
    isLoggedIn: boolean;
    showTitle?: boolean;
}) {
    const { data: session, status } = useSession();
    const { openGate } = useAuthGate();
    const [comments, setComments] = useState<CommentItem[]>(initialComments);
    const [text, setText] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Product picker state
    const [pickerOpen, setPickerOpen] = useState(false);
    const [searchQ, setSearchQ] = useState('');
    const [searchResults, setSearchResults] = useState<ProductResult[]>([]);
    const [searching, setSearching] = useState(false);
    const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    // User mention state
    const [userPickerOpen, setUserPickerOpen] = useState(false);
    const [userSearchQ, setUserSearchQ] = useState('');
    const [userResults, setUserResults] = useState<any[]>([]);
    const [searchingUsers, setSearchingUsers] = useState(false);
    const userSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const searchProducts = useCallback((q: string) => {
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        if (q.length < 2) { setSearchResults([]); return; }
        setSearching(true);
        searchTimeout.current = setTimeout(async () => {
            const res = await fetch(`/api/products/search?q=${encodeURIComponent(q)}`);
            const data = await res.json();
            setSearchResults(data);
            setSearching(false);
        }, 300);
    }, []);

    const insertProductLink = (product: ProductResult) => {
        const link = `[${product.title}](/p/${product.id})`;
        const ta = textareaRef.current;
        if (ta) {
            const start = ta.selectionStart ?? text.length;
            const newText = text.slice(0, start) + link + text.slice(start);
            setText(newText);
            setTimeout(() => {
                ta.focus();
                ta.setSelectionRange(start + link.length, start + link.length);
            }, 0);
        } else {
            setText(prev => prev + (prev.endsWith(' ') || !prev ? '' : ' ') + link);
        }
        setPickerOpen(false);
        setSearchQ('');
        setSearchResults([]);
    };

    const checkMentionTrigger = (val: string, cursorPosition: number) => {
        const textBeforeCursor = val.slice(0, cursorPosition);
        const match = textBeforeCursor.match(/@([a-zA-Z0-9_]*)$/);
        
        if (match) {
            const q = match[1];
            setUserPickerOpen(true);
            setUserSearchQ(q);
            if (q.length >= 2) {
                if (userSearchTimeout.current) clearTimeout(userSearchTimeout.current);
                setSearchingUsers(true);
                userSearchTimeout.current = setTimeout(async () => {
                    const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
                    const data = await res.json();
                    setUserResults(data);
                    setSearchingUsers(false);
                }, 300);
            } else {
                setUserResults([]);
            }
        } else {
            setUserPickerOpen(false);
        }
    };

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setText(val);
        checkMentionTrigger(val, e.target.selectionStart || val.length);
    };

    const insertUserMention = (username: string) => {
        const ta = textareaRef.current;
        if (ta) {
            const cursorPosition = ta.selectionStart || text.length;
            const textBeforeCursor = text.slice(0, cursorPosition);
            const textAfterCursor = text.slice(cursorPosition);
            
            const match = textBeforeCursor.match(/@([a-zA-Z0-9_]*)$/);
            if (match) {
                const newTextBefore = textBeforeCursor.slice(0, match.index) + `@${username} `;
                setText(newTextBefore + textAfterCursor);
                setTimeout(() => {
                    ta.focus();
                    ta.setSelectionRange(newTextBefore.length, newTextBefore.length);
                }, 0);
            }
        }
        setUserPickerOpen(false);
        setUserResults([]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (status === 'unauthenticated') { openGate(); return; }
        if (!text.trim()) return;

        setSubmitting(true);
        setError('');

        const res = await fetch(apiPath, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text.trim() }),
        });

        if (res.ok) {
            const newComment = await res.json();
            setComments(prev => [...prev, newComment]);
            setText('');
        } else {
            const data = await res.json().catch(() => ({}));
            setError(data.message || 'Failed to post comment');
        }
        setSubmitting(false);
    };

    return (
        <div className={styles.commentSection}>
            {showTitle && <h2 className={styles.bidsTitle}>Comments ({comments.length})</h2>}

            {/* Comment list */}
            <div className={styles.commentList}>
                {comments.length === 0 ? (
                    <div className={styles.emptyBids}>
                        <p>No comments yet. Start the conversation!</p>
                    </div>
                ) : (
                    comments.map(c => (
                        <div key={c.id} className={styles.commentCard}>
                            <div className={styles.commentHeader}>
                                <div className={styles.commentAvatar}>
                                    {c.author.displayName.substring(0, 2).toUpperCase()}
                                </div>
                                <div className={styles.commentMeta}>
                                    <span className={styles.commentAuthor}>{c.author.displayName}</span>
                                    <span className={styles.commentTime}>{timeAgo(c.createdAt)}</span>
                                </div>
                            </div>
                            <p className={styles.commentText}>
                                <CommentText text={c.text} />
                            </p>
                        </div>
                    ))
                )}
            </div>

            {/* Comment form — gated by KYC tier */}
            {!isLoggedIn ? (
                <div className={styles.commentGate}>
                    <p className={styles.commentGateText}>Sign in to join the conversation</p>
                    <button className={styles.commentGateBtn} onClick={() => openGate()}>Sign In</button>
                </div>
            ) : !canComment ? (
                <div className={styles.commentGate}>
                    <span className={styles.commentGateIcon}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                    </span>
                    <div>
                        <p className={styles.commentGateText}>Verify your account to comment</p>
                        <p className={styles.commentGateSubtext}>Connect a social account or verify your phone in Settings to join the conversation.</p>
                    </div>
                    <Link href="/settings" className={styles.commentGateBtn}>Get Verified</Link>
                </div>
            ) : null}

            {canComment && (
            <form onSubmit={handleSubmit} className={styles.commentForm}>
                <div className={styles.commentInputWrap}>
                    <div className={styles.commentUserAvatar}>
                        {session?.user?.name?.substring(0, 2).toUpperCase() ?? '?'}
                    </div>
                    <div className={styles.commentInputArea}>
                        <textarea
                            ref={textareaRef}
                            value={text}
                            onChange={handleTextChange}
                            onFocus={() => { if (status === 'unauthenticated') openGate(); }}
                            placeholder="Add a comment..."
                            rows={2}
                            maxLength={500}
                            className={styles.commentTextarea}
                        />
                        <div className={styles.commentActions}>
                            <button
                                type="button"
                                className={styles.linkProductBtn}
                                onClick={() => setPickerOpen(v => !v)}
                                title="Link a product"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="3" width="18" height="18" rx="2" />
                                    <path d="m3 9 18-6" />
                                    <path d="M9 21v-6" />
                                </svg>
                                Link Product
                            </button>
                            <span className={styles.charCount}>{text.length}/500</span>
                            <button
                                type="submit"
                                disabled={submitting || !text.trim()}
                                className={styles.commentSubmitBtn}
                            >
                                {submitting ? '…' : 'Post'}
                            </button>
                        </div>
                    </div>
                </div>

                {error && <p className={styles.errorText}>{error}</p>}

                {/* Product picker */}
                {pickerOpen && (
                    <div className={styles.productPicker}>
                        <input
                            type="search"
                            value={searchQ}
                            onChange={e => { setSearchQ(e.target.value); searchProducts(e.target.value); }}
                            placeholder="Search products to link..."
                            className={styles.pickerSearch}
                            autoFocus
                        />
                        {searching && <p className={styles.pickerStatus}>Searching…</p>}
                        {!searching && searchResults.length === 0 && searchQ.length >= 2 && (
                            <p className={styles.pickerStatus}>No products found</p>
                        )}
                        <div className={styles.pickerResults}>
                            {searchResults.map(p => (
                                <button
                                    key={p.id}
                                    type="button"
                                    className={styles.pickerItem}
                                    onClick={() => insertProductLink(p)}
                                >
                                    <span className={styles.pickerTitle}>{p.title}</span>
                                    <span className={styles.pickerMeta}>{p.storeName} · ₦{p.price.toLocaleString()}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* User mention picker */}
                {userPickerOpen && userSearchQ.length >= 2 && (
                    <div className={styles.productPicker}>
                        {searchingUsers && <p className={styles.pickerStatus}>Searching users…</p>}
                        {!searchingUsers && userResults.length === 0 && (
                            <p className={styles.pickerStatus}>No matches found</p>
                        )}
                        <div className={styles.pickerResults}>
                            {userResults.map(u => (
                                <button
                                    key={u.id}
                                    type="button"
                                    className={styles.userPickerItem}
                                    onClick={() => insertUserMention(u.username)}
                                >
                                    {u.avatarUrl ? (
                                        <img src={u.avatarUrl} alt="" className={styles.userPickerAvatar} />
                                    ) : (
                                        <div className={styles.userPickerAvatar} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '10px', fontWeight: 'bold' }}>
                                            {u.displayName.substring(0, 2).toUpperCase()}
                                        </div>
                                    )}
                                    <div className={styles.userPickerInfo}>
                                        <span className={styles.userPickerName}>{u.displayName}</span>
                                        <span className={styles.userPickerHandle}>@{u.username} {u.type === 'store' ? '(Store)' : ''}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </form>
            )}
        </div>
    );
}
