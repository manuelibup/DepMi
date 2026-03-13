'use client';

import { useState } from 'react';
import styles from './StoreActions.module.css';

type VerificationStatus = 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';

export default function StoreActions({ storeId, verificationStatus, isActive }: {
    storeId: string;
    verificationStatus: VerificationStatus;
    isActive: boolean;
}) {
    const [status, setStatus] = useState(verificationStatus);
    const [active, setActive] = useState(isActive);
    const [loading, setLoading] = useState(false);

    async function verify(s: VerificationStatus) {
        setLoading(true);
        await fetch(`/api/admin/stores/${storeId}/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: s }),
        });
        setStatus(s);
        setLoading(false);
    }

    async function toggleActive() {
        setLoading(true);
        await fetch(`/api/admin/stores/${storeId}/suspend`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ active: !active }),
        });
        setActive(!active);
        setLoading(false);
    }

    return (
        <div className={styles.wrap}>
            <div className={styles.group}>
                {(['VERIFIED', 'REJECTED', 'PENDING', 'UNVERIFIED'] as VerificationStatus[]).map(s => (
                    <button
                        key={s}
                        className={`${styles.btn} ${status === s ? styles.active : ''} ${styles[s.toLowerCase()]}`}
                        disabled={loading || status === s}
                        onClick={() => verify(s)}>
                        {s === 'VERIFIED' ? '✓ Verify' : s === 'REJECTED' ? '✗ Reject' : s === 'PENDING' ? '⏳ Pending' : 'Unverify'}
                    </button>
                ))}
            </div>
            <button
                className={`${styles.btn} ${active ? styles.suspend : styles.restore}`}
                disabled={loading}
                onClick={toggleActive}>
                {active ? 'Suspend Store' : 'Restore Store'}
            </button>
        </div>
    );
}
