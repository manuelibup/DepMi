'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import CloudinaryUploader, { CloudinaryUploadResult } from '@/components/CloudinaryUploader';
import BidActionGate from './BidActionGate';
import BidForm from './BidForm';
import AcceptBidButton from './AcceptBidButton';
import CommentSection, { CommentText } from './CommentSection';
import DemandMediaCarousel from './DemandMediaCarousel';
import styles from './RequestDetail.module.css';

type SerializedComment = {
    id: string;
    text: string;
    images?: string[];
    videoUrl?: string | null;
    author: { displayName: string; username?: string | null; avatarUrl?: string | null };
    createdAt: string;
};

type SerializedBid = {
    id: string;
    amount: number;
    proposal: string | null;
    images?: string[];
    videoUrl?: string | null;
    isAccepted: boolean;
    store: { name: string; slug: string | null; logoUrl?: string | null };
    ownerUserId: string | null;
    ownerUsername: string | null;
    product: { title: string; slug: string } | null;
    replies: SerializedComment[];
};

interface Props {
    bids: SerializedBid[];
    comments: SerializedComment[];
    isPoster: boolean;
    demandId: string;
    isActive: boolean;
    hasStore: boolean;
    storeId?: string;
    storeProducts: { id: string; title: string; price: number }[];
    canComment: boolean;
    isLoggedIn: boolean;
    sessionUserId?: string;
    apiPath: string;
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

function BidReplyThread({
    bid,
    isLoggedIn,
    canComment,
    expanded,
    onToggle,
}: {
    bid: SerializedBid;
    isLoggedIn: boolean;
    canComment: boolean;
    expanded: boolean;
    onToggle: () => void;
}) {
    const { data: session } = useSession();
    const [replies, setReplies] = useState<SerializedComment[]>(bid.replies);
    const [replyText, setReplyText] = useState('');
    const [images, setImages] = useState<string[]>([]);
    const [videoUrl, setVideoUrl] = useState<string>('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const submitReply = async () => {
        if (!replyText.trim()) return;
        setSubmitting(true);
        setError('');
        const res = await fetch(`/api/bids/${bid.id}/replies`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                text: replyText.trim(),
                images: images.length > 0 ? images : undefined,
                videoUrl: videoUrl || undefined
            }),
        });
        if (res.ok) {
            const newReply = await res.json();
            setReplies(prev => [...prev, newReply]);
            setReplyText('');
            setImages([]);
            setVideoUrl('');
        } else {
            const data = await res.json().catch(() => ({}));
            setError(data.message || 'Failed to post reply');
        }
        setSubmitting(false);
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        void submitReply();
    };

    return (
        <div className={styles.bidReplySection}>
            {/* Toggle button */}
            <button
                type="button"
                className={styles.bidReplyToggle}
                onClick={onToggle}
            >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                {replies.length > 0 ? `${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}` : 'Reply'}
                <svg
                    width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                    style={{ marginLeft: 2, transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
                >
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </button>

            {expanded && (
                <div className={styles.bidReplyList}>
                    {/* Existing replies */}
                    {replies.map(r => (
                        <div key={r.id} className={styles.bidReplyItem}>
                            <div className={styles.bidReplyAvatar}>
                                {r.author.avatarUrl ? (
                                    <img src={r.author.avatarUrl} alt={r.author.displayName} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                                ) : (
                                    r.author.displayName.substring(0, 2).toUpperCase()
                                )}
                            </div>
                            <div className={styles.bidReplyContent}>
                                <div className={styles.bidReplyMeta}>
                                    {r.author.username ? (
                                        <Link href={`/${r.author.username}`} className={styles.bidReplyAuthor}>{r.author.displayName}</Link>
                                    ) : (
                                        <span className={styles.bidReplyAuthor}>{r.author.displayName}</span>
                                    )}
                                    <span className={styles.bidReplyTime}>· {timeAgo(r.createdAt)}</span>
                                </div>
                                <p className={styles.bidReplyText}><CommentText text={r.text} /></p>
                                {(r.images && r.images.length > 0 || r.videoUrl) && (
                                    <div style={{ marginTop: '6px', borderRadius: '8px', overflow: 'hidden', background: '#000', maxHeight: '200px' }}>
                                        <DemandMediaCarousel 
                                            images={r.images?.map(url => ({ url })) ?? []} 
                                            videoUrl={r.videoUrl} 
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Reply form */}
                    {isLoggedIn && canComment && (
                        <form onSubmit={handleSubmit} className={styles.bidReplyForm}>
                            <div className={styles.bidReplyInputRow}>
                                <div className={styles.bidReplyAvatar} style={{ flexShrink: 0 }}>
                                    {session?.user?.image ? (
                                        <img src={session.user.image} alt="you" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                                    ) : (
                                        session?.user?.name?.substring(0, 2).toUpperCase() ?? '?'
                                    )}
                                </div>
                                <textarea
                                    value={replyText}
                                    onChange={e => setReplyText(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); void submitReply(); } }}
                                    placeholder={`Reply to ${bid.store.name}… (Ctrl+Enter to post)`}
                                    maxLength={500}
                                    rows={2}
                                    className={styles.bidReplyTextarea}
                                />
                            </div>
                            {/* Media Preview */}
                            <div style={{ display: 'flex', gap: '6px', marginLeft: '38px', marginTop: '6px', flexWrap: 'wrap' }}>
                                {images.map((url, idx) => (
                                    <div key={idx} style={{ position: 'relative', width: 40, height: 40 }}>
                                        <img src={url} alt="upload" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4 }} />
                                        <button type="button" onClick={() => setImages(p => p.filter((_, i) => i !== idx))} style={{ position: 'absolute', top: -4, right: -4, background: 'red', color: 'white', borderRadius: '50%', width: 14, height: 14, border: 'none', cursor: 'pointer', fontSize: 9 }}>✕</button>
                                    </div>
                                ))}
                                {videoUrl && (
                                    <div style={{ position: 'relative', width: 40, height: 40 }}>
                                        <video src={videoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4 }} muted />
                                        <button type="button" onClick={() => setVideoUrl('')} style={{ position: 'absolute', top: -4, right: -4, background: 'red', color: 'white', borderRadius: '50%', width: 14, height: 14, border: 'none', cursor: 'pointer', fontSize: 9 }}>✕</button>
                                    </div>
                                )}
                            </div>

                            {error && <p style={{ color: 'var(--error)', fontSize: '0.8rem', margin: '4px 0 0' }}>{error}</p>}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {(images.length + (videoUrl ? 1 : 0)) < 4 && (
                                        <CloudinaryUploader
                                            onUploadSuccess={(res: CloudinaryUploadResult) => setImages(p => [...p, res.secure_url])}
                                            accept="image/*"
                                            maxSizeMB={5}
                                            buttonText="Photo"
                                        />
                                    )}
                                    {(images.length + (videoUrl ? 1 : 0)) < 4 && !videoUrl && (
                                        <CloudinaryUploader
                                            onUploadSuccess={(res: CloudinaryUploadResult) => setVideoUrl(res.secure_url)}
                                            accept="video/*"
                                            maxSizeMB={50}
                                            maxDurationSeconds={30}
                                            buttonText="Video"
                                        />
                                    )}
                                </div>
                                <button
                                    type="submit"
                                    disabled={submitting || (!replyText.trim() && images.length === 0 && !videoUrl)}
                                    className={styles.commentSubmitBtn}
                                    style={{ fontSize: '0.8rem', padding: '6px 14px' }}
                                >
                                    {submitting ? '…' : 'Post'}
                                </button>
                            </div>
                        </form>
                    )}

                    {!isLoggedIn && (
                        <p className={styles.bidReplyGate}>Sign in to reply</p>
                    )}
                </div>
            )}
        </div>
    );
}

export default function BidsCommentsTab({
    bids, comments, isPoster, demandId, isActive, hasStore,
    storeId, storeProducts, canComment, isLoggedIn, sessionUserId, apiPath,
}: Props) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'bids' | 'discussion'>('bids');
    const [expandedBidId, setExpandedBidId] = useState<string | null>(null);
    const [messagingUserId, setMessagingUserId] = useState<string | null>(null);

    const handleMessage = useCallback(async (ownerUserId: string) => {
        if (!isLoggedIn) return;
        setMessagingUserId(ownerUserId);
        try {
            const res = await fetch('/api/messages/new', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: ownerUserId }),
            });
            const data = await res.json();
            if (data.conversationId) {
                router.push(`/messages/${data.conversationId}`);
            }
        } catch {
            // ignore
        } finally {
            setMessagingUserId(null);
        }
    }, [isLoggedIn, router]);

    return (
        <div className={styles.tabSection} data-comments-section>
            {/* Tab bar */}
            <div className={styles.tabBar}>
                <button
                    type="button"
                    className={`${styles.tab} ${activeTab === 'bids' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('bids')}
                >
                    Bids
                    <span className={`${styles.tabBadge} ${activeTab === 'bids' ? styles.tabBadgeActive : ''}`}>
                        {bids.length}
                    </span>
                </button>
                <button
                    type="button"
                    className={`${styles.tab} ${activeTab === 'discussion' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('discussion')}
                >
                    Discussion
                    <span className={`${styles.tabBadge} ${activeTab === 'discussion' ? styles.tabBadgeActive : ''}`}>
                        {comments.length}
                    </span>
                </button>
            </div>

            {/* Bids tab */}
            {activeTab === 'bids' && (
                <div className={styles.tabBidsContent}>
                    {!isActive && (
                        <div style={{ padding: '16px', marginBottom: '16px', background: 'var(--bg-elevated)', borderRadius: '12px', color: 'var(--text-secondary)', textAlign: 'center', border: '1px solid var(--card-border)' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '8px', opacity: 0.7 }}><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                            <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-main)' }}>This request is closed</p>
                            <p style={{ margin: '4px 0 0', fontSize: '0.9rem' }}>The poster has found what they were looking for. No new bids can be placed.</p>
                        </div>
                    )}
                    {isActive && !isPoster && !hasStore && (
                        <div className={styles.buyerGate}>
                            <BidActionGate isLoggedIn={isLoggedIn} />
                        </div>
                    )}
                    {isActive && !isPoster && hasStore && storeId && (
                        <div className={styles.vendorFormArea}>
                            <BidForm demandId={demandId} storeId={storeId} products={storeProducts} />
                        </div>
                    )}
                    <div className={styles.bidList}>
                        {bids.length === 0 ? (
                            <div className={styles.emptyBids}>
                                <p>No bids yet. Be the first to offer a price!</p>
                            </div>
                        ) : (
                            bids.map(bid => (
                                <div key={bid.id} className={styles.bidCard}>
                                    <div className={styles.bidHeader}>
                                        <div className={styles.bidHeaderLeft}>
                                            <div className={styles.bidAvatar}>
                                                {bid.store.logoUrl ? (
                                                    <img src={bid.store.logoUrl} alt={bid.store.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                                                ) : (
                                                    bid.store.name.substring(0, 2).toUpperCase()
                                                )}
                                            </div>
                                            <div className={styles.bidStoreInfo}>
                                                {bid.store.slug ? (
                                                    <Link href={`/store/${bid.store.slug}`} className={styles.bidStoreName}>
                                                        {bid.store.name}
                                                    </Link>
                                                ) : (
                                                    <strong>{bid.store.name}</strong>
                                                )}
                                                {bid.ownerUsername && (
                                                    <Link href={`/${bid.ownerUsername}`} className={styles.bidOwnerHandle}>
                                                        @{bid.ownerUsername}
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                        <span className={styles.bidPrice}>₦{bid.amount.toLocaleString()}</span>
                                    </div>
                                    {bid.proposal && <p className={styles.bidProposal}><CommentText text={bid.proposal} /></p>}
                                    {bid.product && (
                                        <div className={styles.attachedProduct}>
                                            <div className={styles.productIcon}>
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <rect x="3" y="3" width="18" height="18" rx="2" />
                                                    <path d="m3 9 18-6" />
                                                    <path d="M9 21v-6" />
                                                </svg>
                                            </div>
                                            <Link href={`/p/${bid.product.slug}`} className={styles.attachedProductLink}>
                                                Attached: {bid.product.title}
                                            </Link>
                                        </div>
                                    )}

                                    {/* Uploaded Media */}
                                    {(bid.images && bid.images.length > 0 || bid.videoUrl) && (
                                        <div style={{ marginTop: '12px', marginBottom: '12px', borderRadius: '12px', overflow: 'hidden', background: '#000', maxHeight: '400px' }}>
                                            <DemandMediaCarousel 
                                                images={bid.images?.map(url => ({ url })) ?? []} 
                                                videoUrl={bid.videoUrl} 
                                            />
                                        </div>
                                    )}

                                    {/* Bid action row */}
                                    <div className={styles.bidActions}>
                                        {isPoster && isActive && (
                                            <AcceptBidButton bidId={bid.id} demandId={demandId} />
                                        )}
                                        {isPoster && !isActive && bid.isAccepted && (
                                            <p className={styles.successState} style={{ padding: '8px', textAlign: 'center' }}>✓ Accepted Bid</p>
                                        )}
                                        {/* Message button — DM the store owner */}
                                        {isLoggedIn && bid.ownerUserId && bid.ownerUserId !== sessionUserId && (
                                            <div className={styles.bidContactBtns}>
                                                <button
                                                    type="button"
                                                    className={styles.bidMsgBtn}
                                                    onClick={() => handleMessage(bid.ownerUserId!)}
                                                    disabled={messagingUserId === bid.ownerUserId}
                                                    title="Send a direct message"
                                                >
                                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                                        <polyline points="22,6 12,13 2,6" />
                                                    </svg>
                                                    {messagingUserId === bid.ownerUserId ? '…' : 'Message'}
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Inline reply thread */}
                                    <BidReplyThread
                                        bid={bid}
                                        isLoggedIn={isLoggedIn}
                                        canComment={canComment}
                                        expanded={expandedBidId === bid.id}
                                        onToggle={() => setExpandedBidId(prev => prev === bid.id ? null : bid.id)}
                                    />
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Discussion tab — general conversation not tied to a specific bid */}
            {activeTab === 'discussion' && (
                <div className={styles.tabDiscussionContent} data-comments-section>
                    <CommentSection
                        apiPath={apiPath}
                        initialComments={comments}
                        canComment={canComment}
                        isLoggedIn={isLoggedIn}
                        showTitle={false}
                    />
                </div>
            )}
        </div>
    );
}
