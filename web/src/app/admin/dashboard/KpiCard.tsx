import React from 'react';
import Link from 'next/link';
import styles from './KpiCard.module.css';

interface KpiCardProps {
    label: string;
    value: string | number;
    icon: React.ReactNode;
    delta?: string;
    color?: string;
    href?: string;
}

export default function KpiCard({ label, value, icon, delta, color, href }: KpiCardProps) {
    const content = (
        <div className={styles.card} data-clickable={!!href}>
            <div className={styles.iconWrap} style={{ background: color ? `${color}20` : 'rgba(0,102,255,0.12)' }}>
                <span style={{ color: color ?? 'var(--primary)' }}>{icon}</span>
            </div>
            <div className={styles.body}>
                <span className={styles.label}>{label}</span>
                <span className={styles.value}>{value}</span>
                {delta && <span className={styles.delta}>{delta}</span>}
            </div>
        </div>
    );

    if (href) {
        return <Link href={href} style={{ textDecoration: 'none', color: 'inherit' }}>{content}</Link>;
    }

    return content;
}
