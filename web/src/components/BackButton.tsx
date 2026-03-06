'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export default function BackButton({ className }: { className?: string }) {
    const router = useRouter();

    return (
        <button 
            type="button" 
            onClick={() => router.back()} 
            className={className} 
            aria-label="Go back"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'inherit' }}
        >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6"/>
            </svg>
        </button>
    );
}
