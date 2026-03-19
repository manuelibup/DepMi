'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { withWatermark } from '@/lib/cloudinaryWatermark';

interface ProductImage {
    id: string;
    url: string;
}

interface Props {
    images: ProductImage[];
    title: string;
    videoUrl?: string | null;
}

export default function ProductImageGallery({ images, title, videoUrl }: Props) {
    type MediaItem = { type: 'video'; url: string } | { type: 'image'; id: string; url: string };
    const items: MediaItem[] = [
        ...(videoUrl ? [{ type: 'video' as const, url: videoUrl }] : []),
        ...images.map(img => ({ type: 'image' as const, id: img.id, url: img.url })),
    ];

    const [idx, setIdx] = useState(0);
    const touchStartX = useRef<number | null>(null);

    if (items.length === 0) {
        return (
            <div style={{ width: '100%', aspectRatio: '1/1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', background: 'var(--bg-hover)' }}>
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="18" x="3" y="3" rx="2" />
                    <circle cx="9" cy="9" r="2" />
                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                </svg>
            </div>
        );
    }

    const prev = () => setIdx(i => (i - 1 + items.length) % items.length);
    const next = () => setIdx(i => (i + 1) % items.length);
    const current = items[idx];

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartX.current === null) return;
        const delta = e.changedTouches[0].clientX - touchStartX.current;
        if (Math.abs(delta) > 40) {
            delta < 0 ? next() : prev();
        }
        touchStartX.current = null;
    };

    return (
        <div
            style={{ position: 'relative', width: '100%', userSelect: 'none' }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            {/* Media frame */}
            <div style={{ width: '100%', aspectRatio: '1/1', position: 'relative', background: 'var(--bg-hover)', overflow: 'hidden' }}>
                {current.type === 'video' ? (
                    <video
                        src={current.url}
                        controls
                        playsInline
                        style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                    />
                ) : (
                    <Image
                        src={withWatermark(current.url)}
                        alt={`${title} — photo ${idx + 1}`}
                        fill
                        style={{ objectFit: 'contain' }}
                        sizes="100vw"
                        priority={idx === 0}
                    />
                )}
            </div>

            {/* Nav arrows + indicators — only when multiple items */}
            {items.length > 1 && (
                <>
                    <button
                        onClick={prev}
                        aria-label="Previous"
                        style={{
                            position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                            width: 36, height: 36, borderRadius: '50%', border: 'none', cursor: 'pointer',
                            background: 'rgba(0,0,0,0.45)', color: '#fff', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)',
                        }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                    </button>
                    <button
                        onClick={next}
                        aria-label="Next"
                        style={{
                            position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                            width: 36, height: 36, borderRadius: '50%', border: 'none', cursor: 'pointer',
                            background: 'rgba(0,0,0,0.45)', color: '#fff', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)',
                        }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6" />
                        </svg>
                    </button>

                    {/* Counter badge */}
                    <div style={{
                        position: 'absolute', bottom: 10, right: 12,
                        background: 'rgba(0,0,0,0.55)', color: '#fff', borderRadius: 20,
                        padding: '3px 10px', fontSize: 12, fontWeight: 600, backdropFilter: 'blur(4px)',
                    }}>
                        {idx + 1} / {items.length}
                    </div>

                    {/* Dot indicators */}
                    <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6 }}>
                        {items.map((item, i) => (
                            <button
                                key={i}
                                onClick={() => setIdx(i)}
                                aria-label={`Go to ${item.type} ${i + 1}`}
                                style={{
                                    width: i === idx ? 18 : 6, height: 6, borderRadius: 3, border: 'none', padding: 0,
                                    background: i === idx ? 'var(--primary)' : 'rgba(255,255,255,0.5)',
                                    cursor: 'pointer', transition: 'width 0.2s, background 0.2s',
                                }}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
