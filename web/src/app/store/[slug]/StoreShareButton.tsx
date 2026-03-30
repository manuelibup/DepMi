'use client';

import React, { useState } from 'react';

interface Props {
    storeName: string;
    storeSlug: string;
    location?: string | null;
}

export default function StoreShareButton({ storeName, storeSlug, location }: Props) {
    const [flash, setFlash] = useState(false);
    const url = `https://depmi.com/${storeSlug}`;
    const shareText = `Check out ${storeName} on DepMi${location ? ` (${location})` : ''}: ${url}`;

    const handleShare = async () => {
        if (typeof navigator !== 'undefined' && navigator.share) {
            try {
                await navigator.share({ title: storeName, text: shareText, url });
                return;
            } catch {
                // user cancelled or API unsupported — fall through
            }
        }
        // Copy to clipboard + show flash
        try {
            await navigator.clipboard.writeText(url);
            setFlash(true);
            setTimeout(() => setFlash(false), 2000);
        } catch {
            // Last resort: open WhatsApp share
            window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
        }
    };

    return (
        <button
            onClick={handleShare}
            aria-label="Share store"
            title={flash ? 'Link copied!' : 'Share store'}
            style={{
                color: flash ? 'var(--primary)' : '#fff',
                background: flash ? 'rgba(var(--primary-rgb),0.2)' : 'rgba(0,0,0,0.3)',
                padding: '6px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                cursor: 'pointer',
                backdropFilter: 'blur(4px)',
                transition: 'all 0.15s',
                width: '32px',
                height: '32px',
            }}
        >
            {flash ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                </svg>
            ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="18" cy="5" r="3" />
                    <circle cx="6" cy="12" r="3" />
                    <circle cx="18" cy="19" r="3" />
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
            )}
        </button>
    );
}
