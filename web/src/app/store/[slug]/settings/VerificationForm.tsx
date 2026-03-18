'use client';

import React, { useState } from 'react';
import CloudinaryUploader, { CloudinaryUploadResult } from '@/components/CloudinaryUploader';

interface Props {
    slug: string;
    initial: {
        verificationStatus: string;
        cacDocUrl: string;
        rcNumber: string;
        tin: string;
        location: string;
    };
}

const inputStyle: React.CSSProperties = {
    padding: '12px 16px',
    borderRadius: '12px',
    border: '1px solid var(--card-border)',
    background: 'var(--card-bg)',
    color: 'var(--text-main)',
    fontSize: '1rem',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
};

const labelStyle: React.CSSProperties = {
    fontSize: '0.8rem',
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    display: 'block',
    marginBottom: '6px',
};

function StatusBanner({ status }: { status: string }) {
    if (status === 'VERIFIED') return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.25)', borderRadius: '12px', padding: '14px 16px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><polyline points="20 6 9 17 4 12" /></svg>
            <div>
                <p style={{ margin: 0, fontWeight: 700, color: '#059669', fontSize: '0.95rem' }}>Verified Store</p>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Your store displays the verified badge on your storefront.</p>
            </div>
        </div>
    );

    if (status === 'PENDING') return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(253,203,110,0.1)', border: '1px solid rgba(253,203,110,0.3)', borderRadius: '12px', padding: '14px 16px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <div>
                <p style={{ margin: 0, fontWeight: 700, color: 'var(--primary)', fontSize: '0.95rem' }}>Under Review</p>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Your documents are being reviewed. This usually takes 1–3 business days.</p>
            </div>
        </div>
    );

    if (status === 'REJECTED') return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(231,76,60,0.08)', border: '1px solid rgba(231,76,60,0.2)', borderRadius: '12px', padding: '14px 16px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            <div>
                <p style={{ margin: 0, fontWeight: 700, color: '#e74c3c', fontSize: '0.95rem' }}>Verification Rejected</p>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Your submission was rejected. Please resubmit with clear, valid documents.</p>
            </div>
        </div>
    );

    return null;
}

export default function VerificationForm({ slug, initial }: Props) {
    const [status, setStatus] = useState(initial.verificationStatus);
    const [cacDocUrl, setCacDocUrl] = useState(initial.cacDocUrl);
    const [rcNumber, setRcNumber] = useState(initial.rcNumber);
    const [location, setLocation] = useState(initial.location);
    const [tin, setTin] = useState(initial.tin);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    const canSubmit = !!cacDocUrl && rcNumber.trim().length >= 2 && location.trim().length >= 5;
    const isLocked = status === 'VERIFIED' || status === 'PENDING';

    const handleSubmit = async () => {
        if (!canSubmit) return;
        setSubmitting(true);
        setError('');
        try {
            const res = await fetch(`/api/store/${slug}/verification`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cacDocUrl, rcNumber: rcNumber.trim(), location: location.trim(), tin: tin.trim() || undefined }),
            });
            const data = await res.json();
            if (res.ok) {
                setStatus('PENDING');
                setSubmitted(true);
            } else {
                setError(data.message ?? 'Submission failed');
            }
        } catch {
            setError('Network error, please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            <StatusBanner status={status} />

            {!isLocked && (
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                    Verified stores get a badge on their storefront, higher buyer trust, and priority in search results.
                    We verify using your CAC registration documents.
                </p>
            )}

            {/* CAC Document */}
            <div>
                <label style={labelStyle}>CAC Certificate <span style={{ color: '#e74c3c' }}>*</span></label>
                <p style={{ margin: '0 0 10px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Upload a clear photo or scan of your CAC Certificate of Incorporation or Business Name registration.
                </p>
                {cacDocUrl ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(5,150,105,0.06)', border: '1px solid rgba(5,150,105,0.2)', borderRadius: '10px', padding: '10px 14px' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 600, flex: 1 }}>Document uploaded</span>
                        {!isLocked && (
                            <button onClick={() => setCacDocUrl('')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem', padding: '2px 6px' }}>
                                Replace
                            </button>
                        )}
                    </div>
                ) : (
                    <CloudinaryUploader
                        onUploadSuccess={(res: CloudinaryUploadResult) => setCacDocUrl(res.secure_url)}
                        accept="image/*,.pdf"
                        maxSizeMB={10}
                        buttonText="Upload CAC Document"
                    />
                )}
            </div>

            {/* RC Number */}
            <div>
                <label style={labelStyle}>RC Number <span style={{ color: '#e74c3c' }}>*</span></label>
                <input
                    type="text"
                    value={rcNumber}
                    onChange={e => setRcNumber(e.target.value)}
                    placeholder="e.g. RC1234567"
                    maxLength={20}
                    disabled={isLocked}
                    style={{ ...inputStyle, opacity: isLocked ? 0.6 : 1 }}
                />
                <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    The Registration Number on your CAC certificate.
                </p>
            </div>

            {/* Physical Address */}
            <div>
                <label style={labelStyle}>Physical Business Address <span style={{ color: '#e74c3c' }}>*</span></label>
                <input
                    type="text"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="e.g. 12 Adeola Odeku Street, Victoria Island, Lagos"
                    maxLength={300}
                    disabled={isLocked}
                    style={{ ...inputStyle, opacity: isLocked ? 0.6 : 1 }}
                />
            </div>

            {/* TIN (optional) */}
            <div>
                <label style={labelStyle}>Tax ID Number (TIN) <span style={{ color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>— optional</span></label>
                <input
                    type="text"
                    value={tin}
                    onChange={e => setTin(e.target.value)}
                    placeholder="e.g. 1234567890"
                    maxLength={20}
                    disabled={isLocked}
                    style={{ ...inputStyle, opacity: isLocked ? 0.6 : 1 }}
                />
            </div>

            {error && (
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#e74c3c', background: 'rgba(231,76,60,0.08)', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(231,76,60,0.2)' }}>
                    {error}
                </p>
            )}
            {submitted && (
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--primary)', background: 'rgba(5,150,105,0.08)', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(5,150,105,0.2)' }}>
                    ✓ Documents submitted. We&apos;ll review within 1–3 business days.
                </p>
            )}

            {!isLocked && (
                <button
                    onClick={handleSubmit}
                    disabled={!canSubmit || submitting}
                    style={{
                        padding: '14px',
                        borderRadius: '12px',
                        background: canSubmit && !submitting ? 'var(--primary)' : 'var(--card-border)',
                        color: canSubmit && !submitting ? '#000' : 'var(--text-muted)',
                        fontWeight: 700,
                        fontSize: '0.95rem',
                        border: 'none',
                        cursor: canSubmit && !submitting ? 'pointer' : 'not-allowed',
                    }}
                >
                    {submitting ? 'Submitting…' : 'Submit for Verification'}
                </button>
            )}
        </div>
    );
}
