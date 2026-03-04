'use client';

import React, { useState } from 'react';
import Image from 'next/image';

interface ProductImage {
    id: string;
    url: string;
}

interface Props {
    images: ProductImage[];
    title: string;
}

export default function ProductImageGallery({ images, title }: Props) {
    const [selectedIdx, setSelectedIdx] = useState(0);

    if (images.length === 0) {
        return (
            <div style={{ width: '100%', aspectRatio: '1/1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="18" x="3" y="3" rx="2" />
                    <circle cx="9" cy="9" r="2" />
                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                </svg>
            </div>
        );
    }

    return (
        <>
            {/* Main image */}
            <div style={{ width: '100%', aspectRatio: '1/1', position: 'relative' }}>
                <Image
                    src={images[selectedIdx].url}
                    alt={title}
                    fill
                    style={{ objectFit: 'contain' }}
                    sizes="100vw"
                    priority
                />
            </div>

            {/* Thumbnail strip */}
            {images.length > 1 && (
                <div style={{ display: 'flex', gap: '8px', padding: '8px 16px', overflowX: 'auto', background: 'var(--bg-color)', scrollbarWidth: 'none' }}>
                    {images.map((img, i) => (
                        <button
                            key={img.id}
                            onClick={() => setSelectedIdx(i)}
                            aria-label={`View image ${i + 1}`}
                            style={{
                                flexShrink: 0,
                                width: 64,
                                height: 64,
                                borderRadius: 8,
                                overflow: 'hidden',
                                position: 'relative',
                                border: i === selectedIdx ? '2.5px solid var(--primary)' : '2px solid var(--card-border)',
                                padding: 0,
                                background: 'none',
                                cursor: 'pointer',
                                transition: 'border-color 0.15s ease',
                                opacity: i === selectedIdx ? 1 : 0.65,
                            }}
                        >
                            <Image
                                src={img.url}
                                alt={`${title} photo ${i + 1}`}
                                fill
                                style={{ objectFit: 'cover' }}
                                sizes="64px"
                            />
                        </button>
                    ))}
                </div>
            )}
        </>
    );
}
