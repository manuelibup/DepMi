'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CloudinaryUploader, { CloudinaryUploadResult } from '@/components/CloudinaryUploader';
import Image from 'next/image';

// Simple mapping for categories
const CATEGORIES = [
    'FASHION', 'GADGETS', 'BEAUTY', 'FOOD',
    'FURNITURE', 'VEHICLES', 'SERVICES', 'OTHER'
];

export default function CreateProductForm({ storeId, storeSlug }: { storeId: string; storeSlug: string }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [form, setForm] = useState({
        title: '',
        description: '',
        price: '',
        category: 'OTHER',
        imageUrl: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const payload = {
            storeId,
            title: form.title,
            description: form.description,
            price: Number(form.price),
            category: form.category,
            images: form.imageUrl ? [form.imageUrl] : [],
        };

        try {
            const res = await fetch('/api/products/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (!res.ok) {
                if (data.errors) {
                    const firstError = Object.values(data.errors).flat()[0];
                    setError(firstError as string || 'Invalid input.');
                } else {
                    setError(data.message || 'Something went wrong.');
                }
            } else {
                // Success! Redirect back to the store
                router.push(`/store/${storeSlug}`);
                router.refresh();
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            setError(err.message || 'Failed to create product.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '24px 20px', maxWidth: '400px', margin: '0 auto' }}>
            <header style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
                <Link href={`/store/${storeSlug}`} style={{ marginRight: '16px', color: 'var(--text-main)', display: 'flex' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m15 18-6-6 6-6" />
                    </svg>
                </Link>
                <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Add New Product</h1>
            </header>

            {error && (
                <div style={{ backgroundColor: 'rgba(255, 68, 68, 0.1)', color: '#FF4444', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.875rem' }}>
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Product Title</label>
                    <input
                        type="text"
                        required
                        maxLength={100}
                        placeholder="e.g. Vintage Denim Jacket"
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '1rem', outline: 'none' }}
                        disabled={loading}
                    />
                </div>

                <div style={{ display: 'flex', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                        <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Price (₦)</label>
                        <input
                            type="number"
                            required
                            min="0"
                            placeholder="0.00"
                            value={form.price}
                            onChange={(e) => setForm({ ...form, price: e.target.value })}
                            style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '1rem', outline: 'none' }}
                            disabled={loading}
                        />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                        <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Category</label>
                        <select
                            value={form.category}
                            onChange={(e) => setForm({ ...form, category: e.target.value })}
                            style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '1rem', outline: 'none', appearance: 'none' }}
                            disabled={loading}
                        >
                            {CATEGORIES.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Product Image (Optional)</label>
                    {form.imageUrl ? (
                        <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1', borderRadius: '12px', overflow: 'hidden', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--card-border)' }}>
                            <Image src={form.imageUrl} alt="Product preview" fill style={{ objectFit: 'cover' }} />
                            <button
                                type="button"
                                onClick={() => setForm({ ...form, imageUrl: '' })}
                                style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                            >
                                ✕
                            </button>
                        </div>
                    ) : (
                        <CloudinaryUploader 
                            onUploadSuccess={(res: CloudinaryUploadResult) => setForm({ ...form, imageUrl: res.secure_url })} 
                            accept="image/*"
                            maxSizeMB={10} 
                            buttonText="Upload Photo" 
                        />
                    )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Description (Optional)</label>
                    <textarea
                        rows={4}
                        maxLength={1000}
                        placeholder="Tell buyers about this item..."
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '1rem', outline: 'none', resize: 'vertical' }}
                        disabled={loading}
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading || !form.title || !form.price}
                    style={{
                        marginTop: '12px',
                        padding: '16px',
                        borderRadius: '12px',
                        background: (loading || !form.title || !form.price) ? 'var(--card-border)' : 'linear-gradient(135deg, var(--primary) 0%, #00E676 100%)',
                        color: (loading || !form.title || !form.price) ? 'var(--text-muted)' : '#fff',
                        fontSize: '1rem',
                        fontWeight: 700,
                        border: 'none',
                        cursor: (loading || !form.title || !form.price) ? 'not-allowed' : 'pointer',
                        boxShadow: (loading || !form.title || !form.price) ? 'none' : '0 4px 12px var(--primary-glow)',
                        transition: 'all var(--transition-fast)'
                    }}
                >
                    {loading ? 'Listing Product...' : 'List Product'}
                </button>
            </form>
        </div>
    );
}
