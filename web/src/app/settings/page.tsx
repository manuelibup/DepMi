'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
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

    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    // Populate form from session once loaded
    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login?callbackUrl=/settings');
        if (session?.user) {
            setDisplayName(session.user.name ?? '');
            setUsername(session.user.username ?? '');
            setAvatarUrl(session.user.image ?? '');
        }
    }, [session, status, router]);

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
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.message || 'Failed to save');
            } else {
                setSuccess(true);
                // Refresh session token so UI updates
                await updateSession();
                setTimeout(() => setSuccess(false), 3000);
            }
        } catch {
            setError('Network error, please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <main style={{ minHeight: '100dvh', background: 'var(--bg-base)', paddingBottom: '80px' }}>
            <Header />

            <div style={{ maxWidth: '480px', margin: '0 auto', padding: '24px 16px' }}>

                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
                    <Link href="/profile" style={{ color: 'var(--text-main)', display: 'flex' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m15 18-6-6 6-6" />
                        </svg>
                    </Link>
                    <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Edit Profile</h1>
                </div>

                <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    {/* Avatar */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: 96, height: 96, borderRadius: '50%', background: 'var(--bg-elevated)', border: '2px solid var(--card-border)', overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {avatarUrl ? (
                                <Image src={avatarUrl} alt="Avatar" fill style={{ objectFit: 'cover' }} sizes="96px" />
                            ) : (
                                <span style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary)' }}>
                                    {displayName.charAt(0).toUpperCase() || '?'}
                                </span>
                            )}
                        </div>
                        <div style={{ width: '100%' }}>
                            {avatarUrl ? (
                                <button
                                    type="button"
                                    onClick={() => setAvatarUrl('')}
                                    style={{ width: '100%', padding: '10px', borderRadius: '10px', background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--error)', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}
                                >
                                    Remove Photo
                                </button>
                            ) : (
                                <CloudinaryUploader
                                    onUploadSuccess={(res: CloudinaryUploadResult) => setAvatarUrl(res.secure_url)}
                                    accept="image/*"
                                    maxSizeMB={5}
                                    buttonText="Upload Profile Photo"
                                />
                            )}
                        </div>
                    </div>

                    {/* Display Name */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Display Name</label>
                        <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            maxLength={50}
                            placeholder="Your name"
                            style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '1rem', outline: 'none' }}
                        />
                    </div>

                    {/* Username */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Username</label>
                        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--card-border)', padding: '0 16px' }}>
                            <span style={{ color: 'var(--text-muted)', fontWeight: 600, flexShrink: 0 }}>@</span>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                                maxLength={30}
                                placeholder="yourhandle"
                                style={{ flex: 1, padding: '12px 8px', border: 'none', background: 'transparent', color: 'var(--text-main)', fontSize: '1rem', outline: 'none' }}
                            />
                        </div>
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>
                            depmi.com/u/{username || 'yourhandle'}
                        </p>
                    </div>

                    {error && (
                        <p style={{ color: 'var(--error)', fontSize: '0.875rem', background: 'rgba(255,60,60,0.1)', padding: '10px 14px', borderRadius: '8px', margin: 0 }}>
                            {error}
                        </p>
                    )}

                    {success && (
                        <p style={{ color: 'var(--primary)', fontSize: '0.875rem', background: 'rgba(0,200,83,0.1)', padding: '10px 14px', borderRadius: '8px', margin: 0 }}>
                            ✓ Profile saved
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={saving}
                        style={{
                            padding: '16px', borderRadius: '12px',
                            background: saving ? 'var(--card-border)' : 'linear-gradient(135deg, var(--primary) 0%, #00E676 100%)',
                            color: saving ? 'var(--text-muted)' : '#000',
                            fontWeight: 700, fontSize: '1rem', border: 'none',
                            cursor: saving ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>

                    {/* Sign out */}
                    <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '20px' }}>
                        <Link
                            href="/api/auth/signout"
                            style={{ display: 'block', textAlign: 'center', padding: '14px', borderRadius: '12px', border: '1.5px solid var(--card-border)', color: 'var(--error)', fontWeight: 600, textDecoration: 'none', fontSize: '0.95rem' }}
                        >
                            Sign Out
                        </Link>
                    </div>

                </form>
            </div>

            <BottomNav />
        </main>
    );
}
