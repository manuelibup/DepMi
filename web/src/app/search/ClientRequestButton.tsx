'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuthGate } from '@/context/AuthGate';
import { useSession } from 'next-auth/react';

export default function ClientRequestButton({ searchQuery }: { searchQuery: string }) {
    const { openGate } = useAuthGate();
    const { status } = useSession();
    const router = useRouter();

    const handleRequestClick = () => {
        if (status === 'unauthenticated') {
            openGate();
            return;
        }
        router.push(`/demand/new${searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : ''}`);
    };

    return (
        <button 
            onClick={handleRequestClick}
            style={{ 
                background: 'var(--primary)', 
                color: '#fff', 
                padding: '14px 24px', 
                borderRadius: 'var(--radius-full)', 
                fontWeight: 600, 
                width: '100%', 
                maxWidth: '280px',
                border: 'none',
                cursor: 'pointer'
            }}
        >
            Request This Product
        </button>
    );
}
