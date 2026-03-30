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
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
            }}
        >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span className="hide-on-mobile">{loading ? 'Opening...' : 'Message'}</span>
        </button>
    );
}
