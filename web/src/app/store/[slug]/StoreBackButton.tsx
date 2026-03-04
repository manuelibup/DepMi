'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export default function StoreBackButton() {
    const router = useRouter();

    return (
        <button
            onClick={() => router.back()}
            aria-label="Go back"
            style={{
                position: 'absolute', top: 16, left: 16,
                color: '#fff', background: 'rgba(0,0,0,0.3)',
                padding: '6px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: 'none', cursor: 'pointer',
                backdropFilter: 'blur(4px)',
            }}
        >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6" />
            </svg>
        </button>
    );
}
