'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import CloudinaryUploader, { CloudinaryUploadResult } from '@/components/CloudinaryUploader';

interface Props {
    slug: string;
    storeName: string;
    initial: {
        logoUrl: string;
        bannerUrl: string;
        description: string;
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

export default function StoreProfileForm({ slug, storeName, initial }: Props) {
    const [logoUrl, setLogoUrl] = useState(initial.logoUrl);
    const [bannerUrl, setBannerUrl] = useState(initial.bannerUrl);
    const [description, setDescription] = useState(initial.description);
    const [location, setLocation] = useState(initial.location);
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch(`/api/store/${slug}/settings`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ logoUrl: logoUrl || null, bannerUrl: bannerUrl || null, description: description || null, location: location || null }),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success('Store profile updated');
            } else {
                toast.error(data.message ?? 'Failed to save');
            }
        } catch {
            toast.error('Network error, please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Store name — display-only, locked */}
            <div>
                <label style={labelStyle}>Store Name</label>
                <div style={{
                    ...inputStyle,
                    background: 'var(--bg-elevated)',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                }}>
                    <span style={{ fontWeight: 600 }}>{storeName}</span>
                    <span style={{ fontSize: '0.75rem', background: 'var(--card-border)', borderRadius: '6px', padding: '3px 8px' }}>Locked</span>
                </div>
                <p style={{ margin: '6px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                    Store names cannot be changed. They are a trust signal for your customers.
                </p>
            </div>

            {/* Logo */}
            <div>
                <label style={labelStyle}>Store Logo</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: 72, height: 72, borderRadius: '16px', background: 'var(--bg-elevated)', border: '1px solid var(--card-border)', overflow: 'hidden', position: 'relative', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {logoUrl ? (
                            <Image src={logoUrl} alt="Logo" fill style={{ objectFit: 'cover' }} sizes="72px" />
                        ) : (
                            <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--primary)' }}>{storeName.charAt(0).toUpperCase()}</span>
                        )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <CloudinaryUploader
                            onUploadSuccess={(res: CloudinaryUploadResult) => setLogoUrl(res.secure_url)}
                            accept="image/*"
                            maxSizeMB={5}
                            buttonText={logoUrl ? 'Change Logo' : 'Upload Logo'}
                            cropAspectRatio={1}
                            cropTitle="Crop Store Logo"
                        />
                        {logoUrl && (
                            <button type="button" onClick={() => setLogoUrl('')} style={{ padding: '8px 14px', borderRadius: '10px', background: 'transparent', border: '1px solid var(--card-border)', color: 'var(--text-muted)', fontWeight: 500, cursor: 'pointer', fontSize: '0.8rem' }}>
                                Remove
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Banner */}
            <div>
                <label style={labelStyle}>Store Banner</label>
                <div style={{ position: 'relative', width: '100%', aspectRatio: '3/1', borderRadius: '12px', overflow: 'hidden', background: 'var(--bg-elevated)', border: '1px solid var(--card-border)', marginBottom: '10px' }}>
                    {bannerUrl ? (
                        <Image src={bannerUrl} alt="Banner" fill style={{ objectFit: 'cover' }} sizes="440px" />
                    ) : (
                        <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, var(--primary) 0%, #00E676 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: '0.8rem', color: 'rgba(0,0,0,0.4)', fontWeight: 600 }}>No banner</span>
                        </div>
                    )}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <CloudinaryUploader
                        onUploadSuccess={(res: CloudinaryUploadResult) => setBannerUrl(res.secure_url)}
                        accept="image/*"
                        maxSizeMB={10}
                        buttonText="Upload Banner"
                        cropAspectRatio={3 / 1}
                        cropTitle="Crop Store Banner"
                    />
                    {bannerUrl && (
                        <button type="button" onClick={() => setBannerUrl('')} style={{ padding: '8px 14px', borderRadius: '10px', background: 'transparent', border: '1px solid var(--card-border)', color: 'var(--text-muted)', fontWeight: 500, cursor: 'pointer', fontSize: '0.8rem' }}>
                            Remove
                        </button>
                    )}
                </div>
            </div>

            {/* Description */}
            <div>
                <label style={labelStyle}>Description</label>
                <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    maxLength={500}
                    rows={3}
                    placeholder="Tell buyers what your store sells…"
                    style={{ ...inputStyle, resize: 'none', lineHeight: '1.5' }}
                />
                <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'right' }}>{description.length}/500</p>
            </div>

            {/* Location */}
            <div>
                <label style={labelStyle}>Business Location</label>
                <input
                    type="text"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    maxLength={200}
                    placeholder="e.g. Ikeja, Lagos"
                    style={inputStyle}
                />
            </div>

            <button
                onClick={handleSave}
                disabled={saving}
                style={{
                    padding: '14px',
                    borderRadius: '12px',
                    background: saving ? 'var(--card-border)' : 'var(--primary)',
                    color: saving ? 'var(--text-muted)' : '#000',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    border: 'none',
                    cursor: saving ? 'not-allowed' : 'pointer',
                }}
            >
                {saving ? 'Saving…' : 'Save Profile'}
            </button>
        </div>
    );
}
