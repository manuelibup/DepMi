'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import styles from './DemandCardGrid.module.css';
import type { DemandData } from '@/components/DemandCard';

interface Props {
    data: DemandData;
    index?: number;
}

export default function DemandCardGrid({ data, index = 0 }: Props) {
    const router = useRouter();

    return (
        <article
            className={styles.card}
            style={{ animationDelay: `${index * 40}ms` }}
            onClick={() => data.id && router.push(`/requests/${data.id}`)}
        >
            {/* Avatar + badge */}
            <div className={styles.header}>
                <div className={styles.avatar}>
                    {data.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={data.avatarUrl} alt={data.user} className={styles.avatarImg} />
                    ) : (
                        <span className={styles.avatarInitial}>{data.initials}</span>
                    )}
                </div>
                <span className={styles.badge}>
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                    </svg>
                    Demand
                </span>
            </div>

            {/* Request text */}
            <p className={styles.text}>{data.text}</p>

            {/* Reference image if available */}
            {data.images && data.images.length > 0 && (
                <div className={styles.imageWrap}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={data.images[0]} alt="Reference" className={styles.image} loading="lazy" />
                </div>
            )}

            {/* Budget + bids */}
            <div className={styles.footer}>
                <span className={styles.budget}>
                    {data.budgetMin ? `${data.budgetMin} – ${data.budget}` : data.budget}
                </span>
                {data.bids > 0 && (
                    <span className={styles.bids}>{data.bids} bids</span>
                )}
            </div>
        </article>
    );
}
