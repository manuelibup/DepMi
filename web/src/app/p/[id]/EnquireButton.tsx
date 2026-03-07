'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
    productId: string;
    targetUserId: string; // the owner of the store
    style?: React.CSSProperties;
    text?: React.ReactNode;
}

export default function EnquireButton({ productId, targetUserId, style, text }: Props) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const handleEnquire = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/messages/new', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: targetUserId })
            });
            const data = await res.json();

            if (res.ok && data.conversationId) {
                // Auto-populate the input via query param
                router.push(`/messages/${data.conversationId}?text=${encodeURIComponent(`[product:${productId}]`)}`);
            } else {
                alert(data.message || 'Failed to start conversation');
                setLoading(false);
            }
        } catch (error) {
            console.error('Failed to enquire', error);
            alert('A network error occurred');
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleEnquire}
            disabled={loading}
            style={{
                display: 'block', width: '100%', padding: '16px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, var(--primary) 0%, #00E676 100%)',
                color: '#000', fontWeight: 700, fontSize: '1rem',
                border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                textAlign: 'center', opacity: loading ? 0.7 : 1,
                ...style
            }}
        >
            {loading ? 'Starting Chat...' : (text || 'Enquire About This')}
        </button>
    );
}
