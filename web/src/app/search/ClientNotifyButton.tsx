'use client';

import React, { useState } from 'react';
import { useAuthGate } from '@/context/AuthGate';
import { useSession } from 'next-auth/react';

export default function ClientNotifyButton({ searchQuery }: { searchQuery: string }) {
    const { openGate } = useAuthGate();
    const { status } = useSession();
    const [fetchStatus, setFetchStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

    const handleNotifyClick = async () => {
        if (!searchQuery) return;
        if (status === 'unauthenticated') {
            openGate();
            return;
        }
        
        setFetchStatus('loading');
        try {
            const res = await fetch('/api/product-watch/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ searchQuery }),
            });

            if (!res.ok) {
                // If 401, they probably aren't logged in. Need AuthGate ideally.
                if (res.status === 401) {
                     openGate();
                     setFetchStatus('idle');
                     return;
                }
                throw new Error('Failed');
            }
            setFetchStatus('success');
        } catch {
            setFetchStatus('error');
        }
    };

    if (fetchStatus === 'success') {
        return <p style={{ color: 'var(--primary)', fontWeight: 600, margin: 0 }}>✓ We&apos;ll notify you!</p>;
    }

    return (
        <button 
            onClick={handleNotifyClick}
            disabled={fetchStatus === 'loading' || !searchQuery}
            style={{ 
                background: 'transparent', 
                color: 'var(--text-main)', 
                border: '1px solid var(--card-border)', 
                padding: '14px 24px', 
                borderRadius: 'var(--radius-full)', 
                fontWeight: 600, 
                width: '100%', 
                maxWidth: '280px',
                cursor: searchQuery ? 'pointer' : 'not-allowed',
                opacity: fetchStatus === 'loading' ? 0.7 : 1
            }}
        >
            {fetchStatus === 'loading' ? 'Saving...' : 'Notify Me When Available'}
        </button>
    );
}

