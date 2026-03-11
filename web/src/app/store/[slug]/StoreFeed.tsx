'use client';

import React, { useState, useEffect, useRef } from 'react';
import PostCard, { PostData } from '@/components/PostCard';
import CloudinaryUploader, { CloudinaryUploadResult } from '@/components/CloudinaryUploader';

interface StoreFeedProps {
    storeId: string;
    storeSlug: string;
    sessionUserId?: string;
    isOwner: boolean;
}

export default function StoreFeed({ storeId, storeSlug, sessionUserId, isOwner }: StoreFeedProps) {
    const [posts, setPosts] = useState<PostData[]>([]);
    const [loading, setLoading] = useState(true);
    const [cursor, setCursor] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const [composing, setComposing] = useState(false);
    const [body, setBody] = useState('');
    const [type, setType] = useState<'POST' | 'ANNOUNCEMENT'>('POST');
    const [images, setImages] = useState<string[]>([]);
    const [posting, setPosting] = useState(false);
    const [postError, setPostError] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        fetchPosts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [storeId]);

    async function fetchPosts(afterCursor?: string) {
        try {
            const url = `/api/posts?storeId=${storeId}${afterCursor ? `&cursor=${afterCursor}` : ''}`;
            const res = await fetch(url);
            const data = await res.json();
            const newPosts: PostData[] = (data.posts ?? []).map((p: PostData & { storeId: string }) => ({ ...p, storeSlug }));
            setPosts(prev => afterCursor ? [...prev, ...newPosts] : newPosts);
            setCursor(data.nextCursor ?? null);
            setHasMore(!!data.nextCursor);
        } catch {
            /* ignore */
        } finally {
            setLoading(false);
        }
    }

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [body]);

    async function submitPost(e: React.FormEvent) {
        e.preventDefault();
        if (!body.trim()) return;
        setPosting(true);
        setPostError('');
        try {
            const res = await fetch('/api/posts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storeId, body: body.trim(), type, images }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to post');
            const newPost: PostData = { ...data.post, storeSlug };
            setPosts(prev => [newPost, ...prev]);
            setBody('');
            setImages([]);
            setType('POST');
            setComposing(false);
        } catch (err: unknown) {
            setPostError(err instanceof Error ? err.message : 'Failed to post');
        } finally {
            setPosting(false);
        }
    }

    return (
        <section style={{ padding: '0 16px 16px' }}>
            {/* Section header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Store Updates
                </p>
                {isOwner && !composing && (
                    <button
                        type="button"
                        onClick={() => setComposing(true)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'var(--primary)', color: '#000', border: 'none', borderRadius: '20px', padding: '6px 14px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
                        New Post
                    </button>
                )}
            </div>

            {/* Composer (owner only) */}
            {isOwner && composing && (
                <form onSubmit={submitPost} style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '16px', padding: '16px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {postError && (
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--danger)' }}>{postError}</p>
                    )}

                    {/* Type toggle */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {(['POST', 'ANNOUNCEMENT'] as const).map(t => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => setType(t)}
                                style={{ padding: '5px 12px', borderRadius: '20px', border: '1px solid var(--border)', background: type === t ? 'var(--primary)' : 'transparent', color: type === t ? '#000' : 'var(--text-muted)', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', textTransform: 'capitalize' }}
                            >
                                {t.toLowerCase()}
                            </button>
                        ))}
                    </div>

                    <textarea
                        ref={textareaRef}
                        value={body}
                        onChange={e => setBody(e.target.value)}
                        placeholder="Share an update with your followers..."
                        maxLength={2000}
                        rows={3}
                        style={{ resize: 'none', overflow: 'hidden', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 12px', fontSize: '0.9rem', color: 'var(--text-main)', outline: 'none', lineHeight: 1.5, width: '100%', boxSizing: 'border-box' }}
                    />

                    {/* Image previews */}
                    {images.length > 0 && (
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {images.map((url, i) => (
                                <div key={i} style={{ position: 'relative', width: 72, height: 72, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    <button type="button" onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))} style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 18, height: 18, color: '#fff', fontSize: '0.65rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            {images.length < 4 && (
                                <CloudinaryUploader
                                    onUploadSuccess={(res: CloudinaryUploadResult) => setImages(prev => [...prev, res.secure_url])}
                                    accept="image/*"
                                    maxSizeMB={10}
                                    buttonText="Photo"
                                />
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button type="button" onClick={() => { setComposing(false); setBody(''); setImages([]); }} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '20px', padding: '7px 16px', fontSize: '0.85rem', color: 'var(--text-muted)', cursor: 'pointer' }}>Cancel</button>
                            <button type="submit" disabled={!body.trim() || posting} style={{ background: 'var(--primary)', border: 'none', borderRadius: '20px', padding: '7px 18px', fontSize: '0.85rem', fontWeight: 700, color: '#000', cursor: body.trim() && !posting ? 'pointer' : 'not-allowed', opacity: body.trim() && !posting ? 1 : 0.5 }}>
                                {posting ? 'Posting...' : 'Post'}
                            </button>
                        </div>
                    </div>
                </form>
            )}

            {loading ? (
                <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading...</div>
            ) : posts.length === 0 ? (
                <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0 }}>
                        {isOwner ? 'Share your first store update with your followers.' : 'No updates yet.'}
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {posts.map(post => (
                        <PostCard key={post.id} data={post} sessionUserId={sessionUserId} />
                    ))}
                    {hasMore && (
                        <button
                            type="button"
                            onClick={() => fetchPosts(cursor ?? undefined)}
                            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '20px', padding: '10px', fontSize: '0.85rem', color: 'var(--text-muted)', cursor: 'pointer', margin: '8px auto', display: 'block' }}
                        >
                            Load more
                        </button>
                    )}
                </div>
            )}
        </section>
    );
}
