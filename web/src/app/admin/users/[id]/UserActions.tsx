'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './UserActions.module.css';

export default function UserActions({ userId, isBanned, isAdmin }: { userId: string; isBanned: boolean; isAdmin: boolean }) {
    const [banned, setBanned] = useState(isBanned);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function toggleBan() {
        setLoading(true);
        await fetch(`/api/admin/users/${userId}/ban`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ banned: !banned }),
        });
        setBanned(!banned);
        setLoading(false);
        router.refresh();
    }

    if (isAdmin) return <p className={styles.note}>Admin users cannot be banned.</p>;

    return (
        <button
            className={`${styles.btn} ${banned ? styles.unban : styles.ban}`}
            onClick={toggleBan}
            disabled={loading}>
            {loading ? 'Saving…' : banned ? '✓ Unban User' : 'Ban User'}
        </button>
    );
}
