import React from 'react';
import Link from 'next/link';
import styles from './EmptyState.module.css';

interface EmptyStateProps {
    icon?: React.ReactNode;
    title: string;
    description: string;
    actionLabel?: string;
    actionHref?: string;
    onAction?: () => void;
    children?: React.ReactNode;
}

export default function EmptyState({ icon, title, description, actionLabel, actionHref, onAction, children }: EmptyStateProps) {
    return (
        <div className={styles.container}>
            <div className={styles.iconWrapper}>
                {icon || (
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <path d="M14 2v6h6"/>
                        <circle cx="12" cy="13" r="2"/>
                        <path d="M12 15l0 3"/>
                    </svg>
                )}
            </div>
            <h3 className={styles.title}>{title}</h3>
            <p className={styles.description}>{description}</p>
            
            {actionLabel && !children && (
                <div className={styles.actionWrap}>
                    {actionHref ? (
                        <Link href={actionHref} className={styles.actionBtn}>
                            {actionLabel}
                        </Link>
                    ) : (
                        <button onClick={onAction} className={styles.actionBtn}>
                            {actionLabel}
                        </button>
                    )}
                </div>
            )}

            {children && (
                <div className={styles.actionWrap} style={{ flexDirection: 'column', gap: '12px' }}>
                    {children}
                </div>
            )}
        </div>
    );
}
