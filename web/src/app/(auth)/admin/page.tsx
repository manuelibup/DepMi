'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';

export default function AdminPage() {
    const { status } = useSession();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ message: string, inviteUrl?: string } | null>(null);

    if (status === 'loading') {
        return <div style={{ padding: '2rem' }}>Loading...</div>;
    }

    if (status === 'unauthenticated') {
        return (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
                <p>Not authorized. Please sign in.</p>
            </div>
        );
    }

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setResult(null);

        try {
            const res = await fetch('/api/admin/invite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();

            if (res.ok) {
                setResult(data);
                setEmail(''); // Clear form on success
            } else {
                setResult({ message: data.message || 'Failed to generate invite' });
            }
        } catch {
            setResult({ message: 'An unexpected error occurred' });
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert('Invite link copied to clipboard!');
    };

    return (
        <main style={{ maxWidth: '600px', margin: '4rem auto', padding: '0 1.5rem', fontFamily: 'var(--font-heading)' }}>
            <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem', fontWeight: 700 }}>Vendor Admin Dashboard</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                Generate secure 48-hour invite links for pilot vendors to bypass public onboarding.
            </p>

            <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--card-bg)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
                <div>
                    <label htmlFor="email" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Vendor Email Address</label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="vendor@example.com"
                        required
                        style={{
                            width: '100%',
                            padding: '0.75rem 1rem',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border)',
                            background: 'var(--input-bg)',
                            color: 'var(--text-primary)',
                            outline: 'none',
                        }}
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading || !email}
                    style={{
                        padding: '0.875rem',
                        background: 'var(--primary)',
                        color: '#000',
                        fontWeight: 700,
                        border: 'none',
                        borderRadius: 'var(--radius-full)',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading || !email ? 0.7 : 1,
                        transition: 'opacity 0.2s',
                        marginTop: '0.5rem'
                    }}
                >
                    {loading ? 'Generating...' : 'Generate Magic Link'}
                </button>
            </form>

            {result && (
                <div style={{
                    marginTop: '2rem',
                    padding: '1.5rem',
                    borderRadius: 'var(--radius-lg)',
                    background: result.inviteUrl ? 'rgba(0, 200, 83, 0.1)' : 'rgba(255, 60, 60, 0.1)',
                    border: `1px solid ${result.inviteUrl ? 'var(--primary)' : 'var(--danger)'}`,
                }}>
                    <p style={{ fontWeight: 600, marginBottom: '0.5rem', color: result.inviteUrl ? 'var(--primary)' : 'var(--danger)' }}>
                        {result.message}
                    </p>

                    {result.inviteUrl && (
                        <div>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Send this exact link to the vendor on WhatsApp or Twitter/X:</p>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <input
                                    readOnly
                                    value={result.inviteUrl}
                                    style={{
                                        flex: 1,
                                        padding: '0.75rem',
                                        borderRadius: 'var(--radius-md)',
                                        border: '1px solid var(--border)',
                                        background: 'var(--bg-primary)',
                                        color: 'var(--text-primary)',
                                        fontFamily: 'monospace',
                                        fontSize: '0.875rem'
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => result.inviteUrl && copyToClipboard(result.inviteUrl)}
                                    style={{
                                        padding: '0 1rem',
                                        background: 'var(--surface-elevated)',
                                        border: '1px solid var(--border)',
                                        borderRadius: 'var(--radius-md)',
                                        cursor: 'pointer',
                                        fontWeight: 600,
                                        color: 'var(--text-primary)'
                                    }}
                                >
                                    Copy
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </main>
    );
}
