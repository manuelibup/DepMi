'use client';

import React, { useState } from 'react';

export default function ClientNotifyButton({ searchQuery }: { searchQuery: string }) {
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

    const handleNotifyClick = async () => {
        if (!searchQuery) return;
        
        setStatus('loading');
        try {
            const res = await fetch('/api/product-watch/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ searchQuery }),
            });

            if (!res.ok) {
                // If 401, they probably aren't logged in. Need AuthGate ideally, 
                // but since it's a simple CTA, let's just log or redirect.
                throw new Error('Failed');
            }
            setStatus('success');
        } catch {
            // we ignore the error for now, maybe prompt login
            setStatus('error');
            // Quick UX hack: if it errors, assume unauth and redirect to login
            window.location.href = '/login?callbackUrl=' + encodeURIComponent(window.location.pathname + window.location.search);
        }
    };

    if (status === 'success') {
        return <p style={{ color: '#00B894', fontWeight: 600, margin: 0 }}>✓ We&apos;ll notify you!</p>;
    }

    return (
        <button 
            onClick={handleNotifyClick}
            disabled={status === 'loading' || !searchQuery}
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
                opacity: status === 'loading' ? 0.7 : 1
            }}
        >
            {status === 'loading' ? 'Saving...' : 'Notify Me When Available'}
        </button>
    );
}

