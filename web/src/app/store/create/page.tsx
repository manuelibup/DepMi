'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function StoreCreatePage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [form, setForm] = useState({
        name: '',
        slug: '',
        description: '',
        location: ''
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Auto-generate slug from name as user types
    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newName = e.target.value;
        const autoSlug = newName.toLowerCase().replace(/[^a-z0-9]/g, '');
        setForm(prev => ({ ...prev, name: newName, slug: autoSlug }));
    };

    if (status === 'loading') {
        return <div style={{ padding: '4rem', textAlign: 'center' }}>Loading verification...</div>;
    }

    if (status === 'unauthenticated') {
        router.push('/login?callbackUrl=/store/create');
        return null;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const res = await fetch('/api/store/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });

            const data = await res.json();

            if (res.ok) {
                // Push them back to the feed for now, or to a custom store dashboard
                router.push('/');
            } else {
                if (res.status === 403) {
                    // TIER_2 Restriction
                    setError("You must verify your BVN first before creating a store. Please check for an Admin invite link.");
                } else {
                    setError(data.message || "Failed to create store.");
                }
            }
        } catch (err) {
            setError("Network error. Please try again.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main style={{ maxWidth: '440px', margin: '4rem auto', padding: '0 1.5rem', fontFamily: 'var(--font-heading)' }}>
            <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', fontWeight: 700 }}>
                    Create Your Store
                </h1>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Set up your business identity and start selling to the DepMi community.
                </p>
            </div>

            <div style={{ background: 'var(--card-bg)', padding: '2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
                {error && (
                    <div style={{ padding: '1rem', background: 'rgba(255, 60, 60, 0.1)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', border: '1px solid var(--danger)', marginBottom: '1.5rem' }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                    {/* Store Name */}
                    <div>
                        <label htmlFor="name" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Store Name</label>
                        <input
                            id="name"
                            type="text"
                            value={form.name}
                            onChange={handleNameChange}
                            placeholder="e.g. Vintage Vault"
                            required
                            style={{
                                width: '100%',
                                padding: '0.875rem 1rem',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border)',
                                background: 'var(--input-bg)',
                                color: 'var(--text-primary)',
                                outline: 'none'
                            }}
                        />
                    </div>

                    {/* Store Handle (Slug) */}
                    <div>
                        <label htmlFor="slug" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Store Handle</label>
                        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--input-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', padding: '0 1rem' }}>
                            <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>@</span>
                            <input
                                id="slug"
                                type="text"
                                value={form.slug}
                                onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '') })}
                                placeholder="vintagevault"
                                required
                                style={{
                                    width: '100%',
                                    padding: '0.875rem 0.5rem',
                                    border: 'none',
                                    background: 'transparent',
                                    color: 'var(--text-primary)',
                                    outline: 'none'
                                }}
                            />
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                            depmi.com/store/{form.slug || 'handle'}
                        </p>
                    </div>

                    {/* Description */}
                    <div>
                        <label htmlFor="description" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Short Description (Optional)</label>
                        <textarea
                            id="description"
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            placeholder="What do you sell?"
                            rows={3}
                            style={{
                                width: '100%',
                                padding: '0.875rem 1rem',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border)',
                                background: 'var(--input-bg)',
                                color: 'var(--text-primary)',
                                outline: 'none',
                                resize: 'vertical'
                            }}
                        />
                    </div>

                    {/* Location */}
                    <div>
                        <label htmlFor="location" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Primary Location (Optional)</label>
                        <input
                            id="location"
                            type="text"
                            value={form.location}
                            onChange={(e) => setForm({ ...form, location: e.target.value })}
                            placeholder="e.g. Lagos, Nigeria"
                            style={{
                                width: '100%',
                                padding: '0.875rem 1rem',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border)',
                                background: 'var(--input-bg)',
                                color: 'var(--text-primary)',
                                outline: 'none'
                            }}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading || form.name.length < 3}
                        style={{
                            padding: '1rem',
                            background: 'var(--primary)',
                            color: '#000',
                            fontWeight: 700,
                            border: 'none',
                            borderRadius: 'var(--radius-md)',
                            cursor: (loading || form.name.length < 3) ? 'not-allowed' : 'pointer',
                            opacity: (loading || form.name.length < 3) ? 0.5 : 1,
                            fontSize: '1rem',
                            marginTop: '1rem'
                        }}
                    >
                        {loading ? 'Minting Store...' : 'Create Store'}
                    </button>

                </form>
            </div>
        </main>
    );
}
