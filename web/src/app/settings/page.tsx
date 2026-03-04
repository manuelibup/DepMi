'use client';

import React, { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import CloudinaryUploader, { CloudinaryUploadResult } from '@/components/CloudinaryUploader';
import BottomNav from '@/components/BottomNav';
import Header from '@/components/Header';

export default function SettingsPage() {
    const { data: session, status, update: updateSession } = useSession();
    const router = useRouter();

    const [displayName, setDisplayName] = useState('');
    const [username, setUsername] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');

    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login?callbackUrl=/settings');
    }, [status, router]);

    // Populate identity fields from session immediately
    useEffect(() => {
        if (session?.user) {
            setDisplayName(session.user.name ?? '');
            setUsername(session.user.username ?? '');
            setAvatarUrl(session.user.image ?? '');
        }
    }, [session]);

    // Fetch address/phone from DB (not in JWT)
    useEffect(() => {
        if (status !== 'authenticated') return;
        fetch('/api/user/update')
            .then(r => r.json())
            .then(data => {
                if (data.user) {
                    setPhoneNumber(data.user.phoneNumber ?? '');
                    setAddress(data.user.address ?? '');
                    setCity(data.user.city ?? '');
                    setState(data.user.state ?? '');
                }
            })
            .catch(() => {});
    }, [status]);

    if (status === 'loading') {
        return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>;
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        setSuccess(false);

        try {
            const res = await fetch('/api/user/update', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    displayName: displayName.trim() || undefined,
                    username: username.trim() || undefined,
                    avatarUrl: avatarUrl || null,
                    phoneNumber: phoneNumber.trim() || null,
                    address: address.trim() || null,
                    city: city.trim() || null,
                    state: state.trim() || null,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.message || 'Failed to save');
            } else {
                setSuccess(true);
                await updateSession();
                setTimeout(() => setSuccess(false), 3000);
            }
        } catch {
            setError('Network error, please try again.');
        } finally {
            setSaving(false);
        }
    };

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
    };

    const labelStyle: React.CSSProperties = {
        fontSize: '0.8rem',
        fontWeight: 600,
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
    };

    const sectionStyle: React.CSSProperties = {
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: '16px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    };

    return (
        <main style={{ minHeight: '100dvh', background: 'var(--bg-color)', paddingBottom: '100px' }}>
            <Header />

            <div style={{ maxWidth: '480px', margin: '0 auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

                {/* Page title */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Link href="/profile" style={{ color: 'var(--text-main)', display: 'flex', flexShrink: 0 }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m15 18-6-6 6-6" />
                        </svg>
                    </Link>
                    <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Settings</h1>
                </div>

                <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    {/* — Profile section — */}
                    <div style={sectionStyle}>
                        <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Profile</p>

                        {/* Avatar */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            {/* Avatar circle with camera overlay */}
                            <div style={{ position: 'relative', flexShrink: 0 }}>
                                <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--bg-elevated)', border: '2px solid var(--card-border)', overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {avatarUrl ? (
                                        <Image src={avatarUrl} alt="Avatar" fill style={{ objectFit: 'cover' }} sizes="72px" />
                                    ) : (
                                        <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--primary)' }}>
                                            {displayName.charAt(0).toUpperCase() || '?'}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Action buttons */}
                            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <CloudinaryUploader
                                    onUploadSuccess={(res: CloudinaryUploadResult) => setAvatarUrl(res.secure_url)}
                                    accept="image/*"
                                    maxSizeMB={5}
                                    buttonText={avatarUrl ? 'Change Photo' : 'Upload Photo'}
                                />
                                {avatarUrl && (
                                    <button
                                        type="button"
                                        onClick={() => setAvatarUrl('')}
                                        style={{ padding: '8px 16px', borderRadius: '10px', background: 'transparent', border: '1px solid var(--card-border)', color: 'var(--text-muted)', fontWeight: 500, cursor: 'pointer', fontSize: '0.8rem' }}
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Display Name */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={labelStyle}>Display Name</label>
                            <input
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                maxLength={50}
                                placeholder="Your name"
                                style={inputStyle}
                            />
                        </div>

                        {/* Username */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={labelStyle}>Username</label>
                            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
                                <span style={{ padding: '12px 0 12px 16px', color: 'var(--text-muted)', fontWeight: 600, flexShrink: 0 }}>@</span>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                                    maxLength={30}
                                    placeholder="yourhandle"
                                    style={{ ...inputStyle, border: 'none', borderRadius: 0, paddingLeft: '6px' }}
                                />
                            </div>
                            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>
                                depmi.com/u/{username || 'yourhandle'}
                            </p>
                        </div>
                    </div>

                    {/* — Contact & Delivery section — */}
                    <div style={sectionStyle}>
                        <div>
                            <p style={{ margin: '0 0 2px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Contact & Delivery</p>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Pre-fills your checkout form automatically.</p>
                        </div>

                        {/* Phone */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={labelStyle}>Phone Number</label>
                            <input
                                type="tel"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                placeholder="+234 800 000 0000"
                                style={inputStyle}
                            />
                        </div>

                        {/* Address */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={labelStyle}>Street Address</label>
                            <input
                                type="text"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                maxLength={200}
                                placeholder="12 Adeola Odeku Street"
                                style={inputStyle}
                            />
                        </div>

                        {/* City + State */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={labelStyle}>City</label>
                                <input
                                    type="text"
                                    value={city}
                                    onChange={(e) => setCity(e.target.value)}
                                    maxLength={100}
                                    placeholder="Lagos"
                                    style={inputStyle}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={labelStyle}>State</label>
                                <input
                                    type="text"
                                    value={state}
                                    onChange={(e) => setState(e.target.value)}
                                    maxLength={100}
                                    placeholder="Lagos State"
                                    style={inputStyle}
                                />
                            </div>
                        </div>
                    </div>

                    {error && (
                        <p style={{ color: 'var(--error)', fontSize: '0.875rem', background: 'var(--error-bg)', padding: '10px 14px', borderRadius: '10px', margin: 0, border: '1px solid var(--error-border)' }}>
                            {error}
                        </p>
                    )}

                    {success && (
                        <p style={{ color: 'var(--primary)', fontSize: '0.875rem', background: 'rgba(0,200,83,0.1)', padding: '10px 14px', borderRadius: '10px', margin: 0, border: '1px solid rgba(0,200,83,0.2)' }}>
                            ✓ Changes saved
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={saving}
                        style={{
                            padding: '16px',
                            borderRadius: '12px',
                            background: saving ? 'var(--card-border)' : 'linear-gradient(135deg, var(--primary) 0%, #00E676 100%)',
                            color: saving ? 'var(--text-muted)' : '#000',
                            fontWeight: 700,
                            fontSize: '1rem',
                            border: 'none',
                            cursor: saving ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>

                    {/* — Account section — */}
                    <div style={{ ...sectionStyle, gap: '0' }}>
                        <p style={{ margin: '0 0 16px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Account</p>
                        <button
                            type="button"
                            onClick={() => signOut({ callbackUrl: '/' })}
                            style={{ padding: '14px', borderRadius: '10px', background: 'transparent', border: '1.5px solid var(--card-border)', color: 'var(--error)', fontWeight: 600, cursor: 'pointer', fontSize: '0.95rem' }}
                        >
                            Sign Out
                        </button>
                    </div>

                </form>
            </div>

            <BottomNav />
        </main>
    );
}
