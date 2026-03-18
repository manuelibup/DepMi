'use client';

import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import { getCroppedImg } from '@/lib/cropImage';

interface CropModalProps {
    imageSrc: string;
    aspectRatio: number;
    onDone: (blob: Blob) => void;
    onCancel: () => void;
    title?: string;
}

export default function CropModal({ imageSrc, aspectRatio, onDone, onCancel, title = 'Crop Photo' }: CropModalProps) {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [flipH, setFlipH] = useState(false);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const [processing, setProcessing] = useState(false);

    const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
        setCroppedAreaPixels(croppedPixels);
    }, []);

    const handleDone = async () => {
        if (!croppedAreaPixels) return;
        setProcessing(true);
        try {
            const blob = await getCroppedImg(imageSrc, croppedAreaPixels, rotation, { horizontal: flipH, vertical: false });
            onDone(blob);
        } catch {
            setProcessing(false);
        }
    };

    const rotateLeft = () => setRotation(r => (r - 90 + 360) % 360);
    const rotateRight = () => setRotation(r => (r + 90) % 360);

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: '#000',
            display: 'flex', flexDirection: 'column',
        }}>
            {/* Header */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 16px',
                background: 'rgba(0,0,0,0.8)',
                backdropFilter: 'blur(10px)',
                flexShrink: 0,
            }}>
                <button
                    type="button"
                    onClick={onCancel}
                    style={{ background: 'none', border: 'none', color: '#fff', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', padding: '4px 8px', borderRadius: '8px' }}
                >
                    Cancel
                </button>
                <span style={{ color: '#fff', fontWeight: 700, fontSize: '1rem' }}>{title}</span>
                <button
                    type="button"
                    onClick={handleDone}
                    disabled={processing}
                    style={{
                        background: 'var(--primary, #059669)', border: 'none',
                        color: '#000', fontSize: '0.95rem', fontWeight: 700,
                        cursor: processing ? 'not-allowed' : 'pointer',
                        padding: '6px 16px', borderRadius: '20px',
                        opacity: processing ? 0.6 : 1,
                    }}
                >
                    {processing ? '…' : 'Done'}
                </button>
            </div>

            {/* Crop area */}
            <div style={{ flex: 1, position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, transform: flipH ? 'scaleX(-1)' : undefined }}>
                    <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        rotation={rotation}
                        aspect={aspectRatio}
                        onCropChange={setCrop}
                        onZoomChange={setZoom}
                        onCropComplete={onCropComplete}
                        style={{
                            containerStyle: { background: '#000' },
                            cropAreaStyle: { borderColor: 'var(--primary, #059669)' },
                        }}
                    />
                </div>
            </div>

            {/* Bottom controls */}
            <div style={{
                background: 'rgba(0,0,0,0.85)',
                backdropFilter: 'blur(10px)',
                padding: '16px',
                flexShrink: 0,
                display: 'flex', flexDirection: 'column', gap: '16px',
            }}>
                {/* Zoom slider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" /></svg>
                    <input
                        type="range"
                        min={1} max={3} step={0.01}
                        value={zoom}
                        onChange={(e) => setZoom(Number(e.target.value))}
                        style={{ flex: 1, accentColor: 'var(--primary, #059669)', cursor: 'pointer' }}
                    />
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                </div>

                {/* Action buttons row */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '24px' }}>
                    {/* Rotate left */}
                    <button type="button" onClick={rotateLeft} style={btnStyle} title="Rotate left">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                            <path d="M3 3v5h5" />
                        </svg>
                    </button>

                    {/* Rotate right */}
                    <button type="button" onClick={rotateRight} style={btnStyle} title="Rotate right">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                            <path d="M21 3v5h-5" />
                        </svg>
                    </button>

                    {/* Flip horizontal */}
                    <button
                        type="button"
                        onClick={() => setFlipH(f => !f)}
                        style={{ ...btnStyle, ...(flipH ? { color: 'var(--primary, #059669)' } : {}) }}
                        title="Flip horizontal"
                    >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M8 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h3" />
                            <path d="M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3" />
                            <path d="M12 20v2" />
                            <path d="M12 14v2" />
                            <path d="M12 8v2" />
                            <path d="M12 2v2" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}

const btnStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '50%',
    width: 44, height: 44,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', cursor: 'pointer',
};
