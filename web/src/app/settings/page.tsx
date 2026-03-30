'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'sonner';
import CloudinaryUploader, { CloudinaryUploadResult } from '@/components/CloudinaryUploader';
import BottomNav from '@/components/BottomNav';
import Header from '@/components/Header';

export default function SettingsPage() {
    const { data: session, status, update: updateSession } = useSession();
    const router = useRouter();

    const [displayName, setDisplayName] = useState('');
    const [username, setUsername] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [coverUrl, setCoverUrl] = useState('');
    const [bio, setBio] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');

    const [emailVerified, setEmailVerified] = useState(false);
    const [phoneVerified, setPhoneVerified] = useState(false);

    // Verification flow state
    const [emailOtpStep, setEmailOtpStep] = useState<'idle' | 'sending' | 'entering' | 'verifying'>('idle');
    const [emailOtpCode, setEmailOtpCode] = useState('');
    const [phoneOtpStep, setPhoneOtpStep] = useState<'idle' | 'sending' | 'entering' | 'verifying'>('idle');
    const [phoneOtpCode, setPhoneOtpCode] = useState('');

    const [saving, setSaving] = useState(false);
    const [analyticsOptOut, setAnalyticsOptOut] = useState(false);
    const [savingOptOut, setSavingOptOut] = useState(false);

    // Only populate identity fields from session once (on first valid session load).
    // Subsequent session changes (e.g. after updateSession()) must NOT overwrite form
    // state, otherwise the stale JWT value reverts what the user just saved.
    const sessionInitialized = useRef(false);

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login?callbackUrl=/settings');
    }, [status, router]);

    // Populate identity fields from session on first load only
    useEffect(() => {
        if (session?.user && !sessionInitialized.current) {
            sessionInitialized.current = true;
            setDisplayName(session.user.name ?? '');
            setUsername((session.user.username ?? '').toLowerCase().replace(/[^a-z0-9_]/g, ''));
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
                    setCoverUrl(data.user.coverUrl ?? '');
                    setBio(data.user.bio ?? '');
                    setPhoneNumber(data.user.phoneNumber ?? '');
                    setAddress(data.user.address ?? '');
                    setCity(data.user.city ?? '');
                    setState(data.user.state ?? '');
                    setEmailVerified(data.user.emailVerified ?? false);
                    setPhoneVerified(data.user.phoneVerified ?? false);
                    setAnalyticsOptOut(data.user.analyticsOptOut ?? false);
                }
            })
            .catch(() => {});
    }, [status]);

    if (status === 'loading') {
        return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>;
    }

    const sendEmailOtp = async () => {
        setEmailOtpStep('sending');
        try {
            const res = await fetch('/api/auth/send-email-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: session!.user.email }),
            });
            if (res.ok) {
                setEmailOtpStep('entering');
            } else {
                const d = await res.json().catch(() => ({}));
                toast.error(d.message || 'Failed to send code');
                setEmailOtpStep('idle');
            }
        } catch {
            toast.error('Network error');
            setEmailOtpStep('idle');
        }
    };

    const verifyEmail = async () => {
        setEmailOtpStep('verifying');
        try {
            const res = await fetch('/api/auth/verify-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: emailOtpCode }),
            });
            if (res.ok) {
                setEmailVerified(true);
                setEmailOtpStep('idle');
                setEmailOtpCode('');
                toast.success('Email verified!');
            } else {
                const d = await res.json().catch(() => ({}));
                toast.error(d.message || 'Invalid code');
                setEmailOtpStep('entering');
            }
        } catch {
            toast.error('Network error');
            setEmailOtpStep('entering');
        }
    };

    const sendPhoneOtp = async () => {
        if (!phoneNumber.trim()) {
            toast.error('Save your phone number first');
            return;
        }
        setPhoneOtpStep('sending');
        try {
            const res = await fetch('/api/auth/send-phone-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phoneNumber: phoneNumber.trim() }),
            });
            if (res.ok) {
                setPhoneOtpStep('entering');
            } else {
                const d = await res.json().catch(() => ({}));
                toast.error(d.message || 'Failed to send SMS');
                setPhoneOtpStep('idle');
            }
        } catch {
            toast.error('Network error');
            setPhoneOtpStep('idle');
        }
    };

    const verifyPhone = async () => {
        setPhoneOtpStep('verifying');
        try {
            const res = await fetch('/api/auth/verify-phone', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phoneNumber: phoneNumber.trim(), code: phoneOtpCode }),
            });
            if (res.ok) {
                setPhoneVerified(true);
                setPhoneOtpStep('idle');
                setPhoneOtpCode('');
                toast.success('Phone verified!');
            } else {
                const d = await res.json().catch(() => ({}));
                toast.error(d.message || 'Invalid code');
                setPhoneOtpStep('entering');
            }
        } catch {
            toast.error('Network error');
            setPhoneOtpStep('entering');
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const res = await fetch('/api/user/update', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    displayName: displayName.trim() || undefined,
                    username: username.trim() || undefined,
                    avatarUrl: avatarUrl || null,
                    coverUrl: coverUrl || null,
                    bio: bio.trim() || null,
                    phoneNumber: phoneNumber.trim() || null,
                    address: address.trim() || null,
                    city: city.trim() || null,
                    state: state.trim() || null,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.message || 'Failed to save changes');
            } else {
                // Update local state directly from API response so the form
                // shows the saved values immediately, without waiting for the
                // JWT to refresh (which would race and overwrite with old values).
                if (data.user?.displayName) setDisplayName(data.user.displayName);
                if (data.user?.username) setUsername(data.user.username);
                if (data.user?.avatarUrl !== undefined) setAvatarUrl(data.user.avatarUrl ?? '');
                toast.success('Changes saved');
                // Pass new values directly so the JWT callback merges them without
                // a DB roundtrip — fixes the username-appears-to-revert bug.
                updateSession({
                    username: data.user?.username,
                    name: data.user?.displayName,
                    picture: data.user?.avatarUrl ?? null,
                });
            }
        } catch {
            toast.error('Network error, please try again.');
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

                        {/* Cover Photo */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={labelStyle}>Cover Photo</label>
                            <div style={{ position: 'relative', width: '100%', aspectRatio: '3/1', borderRadius: '12px', overflow: 'hidden', background: 'var(--bg-elevated)', border: '1px solid var(--card-border)' }}>
                                {coverUrl ? (
                                    <Image src={coverUrl} alt="Cover" fill style={{ objectFit: 'cover' }} sizes="440px" />
                                ) : (
                                    <div style={{ width: '100%', height: '100%', background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>No cover photo</span>
                                    </div>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <CloudinaryUploader
                                    onUploadSuccess={(res: CloudinaryUploadResult) => setCoverUrl(res.secure_url)}
                                    accept="image/*"
                                    maxSizeMB={10}
                                    buttonText="Upload Cover"
                                    cropAspectRatio={3 / 1}
                                    cropTitle="Crop Cover Photo"
                                />
                                {coverUrl && (
                                    <button type="button" onClick={() => setCoverUrl('')} style={{ padding: '8px 14px', borderRadius: '10px', background: 'transparent', border: '1px solid var(--card-border)', color: 'var(--text-muted)', fontWeight: 500, cursor: 'pointer', fontSize: '0.8rem' }}>
                                        Remove
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Avatar */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
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
                            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <CloudinaryUploader
                                    onUploadSuccess={(res: CloudinaryUploadResult) => setAvatarUrl(res.secure_url)}
                                    accept="image/*"
                                    maxSizeMB={5}
                                    buttonText={avatarUrl ? 'Change Photo' : 'Upload Photo'}
                                    cropAspectRatio={1}
                                    cropTitle="Crop Profile Photo"
                                />
                                {avatarUrl && (
                                    <button type="button" onClick={() => setAvatarUrl('')} style={{ padding: '8px 16px', borderRadius: '10px', background: 'transparent', border: '1px solid var(--card-border)', color: 'var(--text-muted)', fontWeight: 500, cursor: 'pointer', fontSize: '0.8rem' }}>
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

                        {/* Bio */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={labelStyle}>Bio</label>
                            <textarea
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleSave(e as unknown as React.FormEvent); } }}
                                maxLength={160}
                                rows={2}
                                placeholder="Tell people a bit about yourself..."
                                style={{ ...inputStyle, resize: 'none', lineHeight: '1.5', fontFamily: 'inherit' }}
                            />
                            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0, textAlign: 'right' }}>{bio.length}/160</p>
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
                                onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9+\s\-()]/g, ''))}
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

                    {/* — Verification section — */}
                    <div style={sectionStyle}>
                        <p style={{ margin: '0 0 4px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Verification</p>

                        {/* Email verification row */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                                <div>
                                    <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Email</p>
                                    <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-main)' }}>{session?.user?.email}</p>
                                </div>
                                {emailVerified ? (
                                    <span style={{ flexShrink: 0, padding: '5px 10px', borderRadius: '20px', background: 'rgba(var(--primary-rgb),0.12)', color: 'var(--primary)', fontSize: '0.8rem', fontWeight: 700 }}>✓ Verified</span>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={sendEmailOtp}
                                        disabled={emailOtpStep !== 'idle'}
                                        style={{ flexShrink: 0, padding: '7px 14px', borderRadius: '10px', background: 'transparent', border: '1.5px solid var(--primary)', color: 'var(--primary)', fontWeight: 600, fontSize: '0.8rem', cursor: emailOtpStep !== 'idle' ? 'not-allowed' : 'pointer', opacity: emailOtpStep !== 'idle' ? 0.6 : 1 }}
                                    >
                                        {emailOtpStep === 'sending' ? 'Sending...' : 'Verify Email'}
                                    </button>
                                )}
                            </div>
                            {emailOtpStep === 'entering' || emailOtpStep === 'verifying' ? (
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={6}
                                        value={emailOtpCode}
                                        onChange={(e) => setEmailOtpCode(e.target.value.replace(/\D/g, ''))}
                                        placeholder="Enter 6-digit code"
                                        style={{ flex: 1, padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '1rem', letterSpacing: '4px', outline: 'none', textAlign: 'center' }}
                                    />
                                    <button
                                        type="button"
                                        onClick={verifyEmail}
                                        disabled={emailOtpCode.length < 6 || emailOtpStep === 'verifying'}
                                        style={{ padding: '10px 16px', borderRadius: '10px', background: 'var(--primary)', color: '#000', fontWeight: 700, fontSize: '0.85rem', border: 'none', cursor: emailOtpCode.length < 6 ? 'not-allowed' : 'pointer', opacity: emailOtpCode.length < 6 ? 0.5 : 1 }}
                                    >
                                        {emailOtpStep === 'verifying' ? '...' : 'Confirm'}
                                    </button>
                                </div>
                            ) : null}
                        </div>

                        {/* Divider */}
                        <div style={{ height: 1, background: 'var(--card-border)' }} />

                        {/* Phone verification row */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                                <div>
                                    <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Phone</p>
                                    <p style={{ margin: 0, fontSize: '0.875rem', color: phoneNumber ? 'var(--text-main)' : 'var(--text-muted)' }}>
                                        {phoneNumber || 'No phone number saved'}
                                    </p>
                                </div>
                                {phoneVerified ? (
                                    <span style={{ flexShrink: 0, padding: '5px 10px', borderRadius: '20px', background: 'rgba(var(--primary-rgb),0.12)', color: 'var(--primary)', fontSize: '0.8rem', fontWeight: 700 }}>✓ Verified</span>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={sendPhoneOtp}
                                        disabled={!phoneNumber || phoneOtpStep !== 'idle'}
                                        style={{ flexShrink: 0, padding: '7px 14px', borderRadius: '10px', background: 'transparent', border: `1.5px solid ${phoneNumber ? 'var(--primary)' : 'var(--card-border)'}`, color: phoneNumber ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 600, fontSize: '0.8rem', cursor: (!phoneNumber || phoneOtpStep !== 'idle') ? 'not-allowed' : 'pointer', opacity: phoneOtpStep !== 'idle' ? 0.6 : 1 }}
                                    >
                                        {phoneOtpStep === 'sending' ? 'Sending...' : 'Verify Phone'}
                                    </button>
                                )}
                            </div>
                            {phoneOtpStep === 'entering' || phoneOtpStep === 'verifying' ? (
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={6}
                                        value={phoneOtpCode}
                                        onChange={(e) => setPhoneOtpCode(e.target.value.replace(/\D/g, ''))}
                                        placeholder="Enter 6-digit code"
                                        style={{ flex: 1, padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '1rem', letterSpacing: '4px', outline: 'none', textAlign: 'center' }}
                                    />
                                    <button
                                        type="button"
                                        onClick={verifyPhone}
                                        disabled={phoneOtpCode.length < 6 || phoneOtpStep === 'verifying'}
                                        style={{ padding: '10px 16px', borderRadius: '10px', background: 'var(--primary)', color: '#000', fontWeight: 700, fontSize: '0.85rem', border: 'none', cursor: phoneOtpCode.length < 6 ? 'not-allowed' : 'pointer', opacity: phoneOtpCode.length < 6 ? 0.5 : 1 }}
                                    >
                                        {phoneOtpStep === 'verifying' ? '...' : 'Confirm'}
                                    </button>
                                </div>
                            ) : null}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={saving}
                        style={{
                            padding: '16px',
                            borderRadius: '12px',
                            background: saving ? 'var(--card-border)' : 'var(--primary)',
                            color: saving ? 'var(--text-muted)' : '#000',
                            fontWeight: 700,
                            fontSize: '1rem',
                            border: 'none',
                            cursor: saving ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>

                    {/* — Privacy section — */}
                    <div style={sectionStyle}>
                        <p style={{ margin: '0 0 4px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Privacy</p>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                            <div>
                                <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>Analytics Opt-Out</p>
                                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                                    Stop DepMi from collecting data about how you use the app.
                                </p>
                            </div>
                            <button
                                type="button"
                                disabled={savingOptOut}
                                onClick={async () => {
                                    setSavingOptOut(true);
                                    const next = !analyticsOptOut;
                                    try {
                                        const res = await fetch('/api/user/update', {
                                            method: 'PATCH',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ analyticsOptOut: next }),
                                        });
                                        if (res.ok) {
                                            setAnalyticsOptOut(next);
                                            toast.success(next ? 'Analytics disabled' : 'Analytics enabled');
                                        } else {
                                            toast.error('Failed to update preference');
                                        }
                                    } catch {
                                        toast.error('Network error');
                                    } finally {
                                        setSavingOptOut(false);
                                    }
                                }}
                                style={{
                                    flexShrink: 0,
                                    width: 48,
                                    height: 28,
                                    borderRadius: 14,
                                    border: 'none',
                                    background: analyticsOptOut ? '#555' : 'var(--primary)',
                                    cursor: savingOptOut ? 'not-allowed' : 'pointer',
                                    position: 'relative',
                                    transition: 'background 0.2s',
                                    opacity: savingOptOut ? 0.6 : 1,
                                }}
                                aria-label="Toggle analytics opt-out"
                            >
                                <span style={{
                                    position: 'absolute',
                                    top: 3,
                                    left: analyticsOptOut ? 23 : 3,
                                    width: 22,
                                    height: 22,
                                    borderRadius: '50%',
                                    background: '#fff',
                                    transition: 'left 0.2s',
                                }} />
                            </button>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            See our <a href="/privacy" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Privacy Policy</a> for details on what we collect.
                        </p>
                    </div>

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
