import React from 'react';
import styles from './Skeleton.module.css';

interface SkeletonProps {
    type: 'card' | 'text' | 'avatar' | 'title';
    count?: number;
    className?: string;
}

export default function Skeleton({ type, count = 1, className = '' }: SkeletonProps) {
    const elements = Array.from({ length: count }, (_, i) => i);

    return (
        <React.Fragment>
            {elements.map((idx) => (
                <div 
                    key={idx} 
                    className={`${styles.skeleton} ${styles[type]} ${className}`}
                />
            ))}
        </React.Fragment>
    );
}

// Pre-composed skeletons for common app patterns
export function ProductCardSkeleton() {
    return (
        <div className={styles.productCard}>
            <div className={`${styles.skeleton} ${styles.productImage}`} />
            <div className={styles.productInfo}>
                <div className={`${styles.skeleton} ${styles.text}`} style={{ width: '40%' }} />
                <div className={`${styles.skeleton} ${styles.title}`} style={{ width: '80%' }} />
                <div className={`${styles.skeleton} ${styles.title}`} style={{ width: '50%', marginTop: 'auto' }} />
            </div>
        </div>
    );
}

export function DemandCardSkeleton() {
    return (
        <div className={styles.demandCard}>
            <div className={styles.demandHeader}>
                <div className={`${styles.skeleton} ${styles.avatar}`} />
                <div style={{ flex: 1 }}>
                    <div className={`${styles.skeleton} ${styles.text}`} style={{ width: '30%', marginBottom: '4px' }} />
                    <div className={`${styles.skeleton} ${styles.text}`} style={{ width: '20%' }} />
                </div>
            </div>
            <div className={`${styles.skeleton} ${styles.text}`} style={{ width: '100%', marginBottom: '4px' }} />
            <div className={`${styles.skeleton} ${styles.text}`} style={{ width: '90%', marginBottom: '16px' }} />
            <div className={styles.demandFooter}>
                <div className={`${styles.skeleton} ${styles.title}`} style={{ width: '30%' }} />
                <div className={`${styles.skeleton} ${styles.title}`} style={{ width: '20%' }} />
            </div>
        </div>
    );
}
