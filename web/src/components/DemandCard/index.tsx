'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuthGate } from '@/context/AuthGate';
import { useSession } from 'next-auth/react';
import styles from './DemandCard.module.css';

export interface DemandData {
    id?: string;
    user: string;
    initials: string;
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
    const { status } = useSession();

    const handleBid = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (status === 'unauthenticated') {
            openGate('Sign in to bid on requests');
            return;
        }
        if (data.id) router.push(`/requests/${data.id}`);
    };

    const handleShare = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const url = data.id ? `${window.location.origin}/requests/${data.id}` : window.location.href;
        if (navigator.share) {
            navigator.share({ title: `DepMi Request: ${data.text.slice(0, 60)}`, url });
        } else {
            navigator.clipboard.writeText(url);
        }
    };

    return (
        <article
            className={styles.card}
            style={{ animationDelay: `${index * 80}ms` }}
        >
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.userInfo}>
                    <div className={styles.avatar}>{data.initials}</div>
                    <div>
                        <p className={styles.userName}>{data.user}</p>
                        <p className={styles.meta}>Looking for &bull; {data.timeAgo}</p>
                    </div>
                </div>
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
                <button className={styles.bidBtn} onClick={handleBid}>
                    Bid as Vendor
                    {data.bids > 0 && <span className={styles.bidCount}>{data.bids} bids</span>}
                </button>
                <button className={styles.shareBtn} aria-label="Share" onClick={handleShare}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                    </svg>
                </button>
            </div>
        </article>
    );
}
