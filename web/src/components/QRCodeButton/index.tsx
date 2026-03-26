'use client';

import React, { useState, useRef, useEffect } from 'react';
import QRCode from 'qrcode';

interface Props {
    url: string;
    label: string;
}

export default function QRCodeButton({ url, label }: Props) {
    const [open, setOpen] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!open || !canvasRef.current) return;
        QRCode.toCanvas(canvasRef.current, url, {
            width: 260,
            margin: 2,
            color: { dark: '#000000', light: '#ffffff' },
        });
    }, [open, url]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open]);

    const handleDownload = () => {
        if (!canvasRef.current) return;
        const a = document.createElement('a');
        a.href = canvasRef.current.toDataURL('image/png');
        a.download = `depmi-${label.replace(/\s+/g, '-').toLowerCase()}.png`;
        a.click();
    };

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                aria-label="Get QR Code"
                title="Get QR Code"
                style={{
                    padding: '7px 16px',
                    borderRadius: '999px',
                    background: 'transparent',
                    color: 'var(--text-main)',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    border: '1.5px solid var(--card-border)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s',
                }}
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                    <path d="M14 14h.01M14 18h.01M18 14h.01M18 18h.01M18 21v-3M21 18h-3" />
                </svg>
                QR Code
            </button>

            {open && (
                <div
                    onClick={() => setOpen(false)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.7)',
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 24,
                    }}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{
                            background: 'var(--bg-color)',
                            border: '1px solid var(--card-border)',
                            borderRadius: 20,
                            padding: '28px 24px 24px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 16,
                            maxWidth: 320,
                            width: '100%',
                        }}
                    >
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                            Your DepMi QR Code
                        </h3>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                            {label}
                        </p>

                        {/* QR canvas — white background for scanning on dark mode */}
                        <div style={{ background: '#fff', borderRadius: 12, padding: 12, lineHeight: 0 }}>
                            <canvas ref={canvasRef} />
                        </div>

                        <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)', wordBreak: 'break-all', textAlign: 'center' }}>
                            {url}
                        </p>

                        <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                            <button
                                onClick={handleDownload}
                                style={{
                                    flex: 1,
                                    padding: '10px 0',
                                    borderRadius: 999,
                                    background: 'var(--primary)',
                                    color: '#000',
                                    fontWeight: 700,
                                    fontSize: '0.875rem',
                                    border: 'none',
                                    cursor: 'pointer',
                                }}
                            >
                                Download PNG
                            </button>
                            <button
                                onClick={() => setOpen(false)}
                                style={{
                                    flex: 1,
                                    padding: '10px 0',
                                    borderRadius: 999,
                                    background: 'transparent',
                                    color: 'var(--text-main)',
                                    fontWeight: 700,
                                    fontSize: '0.875rem',
                                    border: '1.5px solid var(--card-border)',
                                    cursor: 'pointer',
                                }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
