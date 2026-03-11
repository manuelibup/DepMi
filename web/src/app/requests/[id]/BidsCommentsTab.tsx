'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BidActionGate from './BidActionGate';
import BidForm from './BidForm';
import AcceptBidButton from './AcceptBidButton';
import CommentSection from './CommentSection';
import styles from './RequestDetail.module.css';

type SerializedBid = {
    id: string;
    amount: number;
    proposal: string | null;
    isAccepted: boolean;
    store: { name: string; slug: string | null };
    ownerUserId: string | null;
    ownerUsername: string | null;
    product: { title: string } | null;
};

type SerializedComment = {
    id: string;
    text: string;
    author: { displayName: string; username?: string | null };
    createdAt: string;
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

export default function BidsCommentsTab({
    bids, comments, isPoster, demandId, isActive, hasStore,
    storeId, storeProducts, canComment, isLoggedIn, sessionUserId, apiPath,
}: Props) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'bids' | 'discussion'>('bids');
    const [prefillMention, setPrefillMention] = useState<string>('');
    const [messagingUserId, setMessagingUserId] = useState<string | null>(null);

    useEffect(() => {
        if (window.location.hash === '#discussion') {
            setActiveTab('discussion');
        }
    }, []);

    const handleAsk = useCallback((ownerUsername: string) => {
        setPrefillMention(`@${ownerUsername} `);
        setActiveTab('discussion');
    }, []);

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
        <div className={styles.tabSection}>
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
                    {!isPoster && !hasStore && (
                        <div className={styles.buyerGate}>
                            <BidActionGate isLoggedIn={isLoggedIn} />
                        </div>
                    )}
                    {!isPoster && hasStore && storeId && (
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
                                        <div className={styles.bidStoreInfo}>
                                            {bid.store.slug ? (
                                                <Link
                                                    href={`/store/${bid.store.slug}`}
                                                    className={styles.bidStoreName}
                                                >
                                                    {bid.store.name}
                                                </Link>
                                            ) : (
                                                <strong>{bid.store.name}</strong>
                                            )}
                                            {bid.ownerUsername && (
                                                <Link
                                                    href={`/u/${bid.ownerUsername}`}
                                                    className={styles.bidOwnerHandle}
                                                >
                                                    @{bid.ownerUsername}
                                                </Link>
                                            )}
                                        </div>
                                        <span className={styles.bidPrice}>₦{bid.amount.toLocaleString()}</span>
                                    </div>
                                    {bid.proposal && <p className={styles.bidProposal}>{bid.proposal}</p>}
                                    {bid.product && (
                                        <div className={styles.attachedProduct}>
                                            <div className={styles.productIcon}>
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <rect x="3" y="3" width="18" height="18" rx="2" />
                                                    <path d="m3 9 18-6" />
                                                    <path d="M9 21v-6" />
                                                </svg>
                                            </div>
                                            <span>Attached: {bid.product.title}</span>
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
                                        {/* Ask / Message buttons — visible to logged-in non-bidder users */}
                                        {isLoggedIn && bid.ownerUsername && bid.ownerUserId !== sessionUserId && (
                                            <div className={styles.bidContactBtns}>
                                                <button
                                                    type="button"
                                                    className={styles.bidAskBtn}
                                                    onClick={() => handleAsk(bid.ownerUsername!)}
                                                    title="Ask a question in Discussion"
                                                >
                                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                                    </svg>
                                                    Ask
                                                </button>
                                                {bid.ownerUserId && (
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
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Discussion tab */}
            {activeTab === 'discussion' && (
                <div className={styles.tabDiscussionContent}>
                    <CommentSection
                        apiPath={apiPath}
                        initialComments={comments}
                        canComment={canComment}
                        isLoggedIn={isLoggedIn}
                        showTitle={false}
                        prefillText={prefillMention}
                        onPrefillConsumed={() => setPrefillMention('')}
                    />
                </div>
            )}
        </div>
    );
}
