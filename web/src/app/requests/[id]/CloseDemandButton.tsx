'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CloseDemandButton({ demandId }: { demandId: string }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const handleClose = async () => {
        if (!confirm("Are you sure you want to close this request? You won't receive any new bids.")) return;

        setLoading(true);
        try {
            const res = await fetch(`/api/requests/${demandId}/close`, {
                method: 'PATCH'
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Failed to close request');
            }

            // Successfully closed, refresh the page to update the UI
            router.refresh();

        } catch (error: any) {
            alert(error.message);
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleClose}
            disabled={loading}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                background: 'var(--error)',
                color: '#fff',
                border: '1px solid transparent',
                padding: '4px 12px',
                borderRadius: '16px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1
            }}
            title="Mark this request as Closed"
        >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
            </svg>
            {loading ? 'Closing...' : 'Close Request'}
        </button>
    );
}
