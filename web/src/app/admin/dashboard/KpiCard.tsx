import React from 'react';
import styles from './KpiCard.module.css';

interface KpiCardProps {
    label: string;
    value: string | number;
    icon: React.ReactNode;
    delta?: string;
    color?: string;
}

export default function KpiCard({ label, value, icon, delta, color }: KpiCardProps) {
    return (
        <div className={styles.card}>
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
}
