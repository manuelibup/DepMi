'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

interface Props {
    className?: string;
}

export default function BackButton({ className }: Props) {
    const router = useRouter();
    return (
        <button
            onClick={() => router.back()}
            className={className}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-main)', padding: '4px' }}
            aria-label="Go back"
        >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6" />
            </svg>
        </button>
    );
}
