'use client';

import React, { useState, useEffect } from 'react';
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
    store: { name: string };
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
    apiPath: string;
}

export default function BidsCommentsTab({
    bids, comments, isPoster, demandId, isActive, hasStore,
    storeId, storeProducts, canComment, isLoggedIn, apiPath,
}: Props) {
    const [activeTab, setActiveTab] = useState<'bids' | 'discussion'>('bids');

    useEffect(() => {
        if (window.location.hash === '#discussion') {
            setActiveTab('discussion');
        }
    }, []);

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
                                        <strong>{bid.store.name}</strong>
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
                                    {isPoster && isActive && (
                                        <AcceptBidButton bidId={bid.id} demandId={demandId} />
                                    )}
                                    {isPoster && !isActive && bid.isAccepted && (
                                        <p className={styles.successState} style={{ padding: '8px', marginTop: 4, textAlign: 'center' }}>✓ Accepted Bid</p>
                                    )}
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
                    />
                </div>
            )}
        </div>
    );
}
