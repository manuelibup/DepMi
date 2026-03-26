'use client';

import React, { useState } from 'react';

interface Props {
    url: string;
    title: string;
    text: string;
    style?: React.CSSProperties;
}

export default function ShareButton({ url, title, text, style }: Props) {
    const [copied, setCopied] = useState(false);

    const handleShare = async () => {
        if (typeof navigator !== 'undefined' && navigator.share) {
            try {
                await navigator.share({ title, text, url });
                return;
            } catch {
                // user cancelled or API unsupported — fall through
            }
        }
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank');
        }
    };

    return (
        <button
            onClick={handleShare}
            aria-label={copied ? 'Link copied!' : 'Share'}
            title={copied ? 'Link copied!' : 'Share'}
            style={{
                padding: '7px 16px',
                borderRadius: '999px',
                background: 'transparent',
                color: copied ? 'var(--primary)' : 'var(--text-main)',
                fontSize: '0.875rem',
                fontWeight: 700,
                border: `1.5px solid ${copied ? 'var(--primary)' : 'var(--card-border)'}`,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s',
                ...style,
            }}
        >
            {copied ? (
                <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Copied!
                </>
            ) : (
                <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="18" cy="5" r="3" />
                        <circle cx="6" cy="12" r="3" />
                        <circle cx="18" cy="19" r="3" />
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                    </svg>
                    Share
                </>
            )}
        </button>
    );
}
