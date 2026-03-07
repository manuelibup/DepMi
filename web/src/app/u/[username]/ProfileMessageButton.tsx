'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function ProfileMessageButton({ targetUserId }: { targetUserId: string }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const handleMessage = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/messages/new', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: targetUserId })
            });
            const data = await res.json();

            if (res.ok && data.conversationId) {
                router.push(`/messages/${data.conversationId}`);
            } else {
                alert(data.message || 'Failed to start conversation');
                setLoading(false);
            }
        } catch (error) {
            console.error('Failed to message', error);
            alert('A network error occurred');
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleMessage}
            disabled={loading}
            className={styles.editBtn}
            style={{ 
                background: 'var(--primary)', 
                color: '#000', 
                border: 'none',
                opacity: loading ? 0.7 : 1,
                cursor: loading ? 'not-allowed' : 'pointer'
            }}
        >
            {loading ? 'Opening...' : 'Message'}
        </button>
    );
}
