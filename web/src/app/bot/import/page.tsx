'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';

const CATEGORIES = [
    'FASHION', 'GADGETS', 'BEAUTY', 'COSMETICS', 'FOOD',
    'FURNITURE', 'VEHICLES', 'SERVICES', 'TRANSPORT',
    'SPORT', 'HOUSING', 'BOOKS', 'COURSE', 'OTHER',
];

interface ParsedData {
    title: string;
    price: number;
    description: string;
    category: string;
    confidence: 'high' | 'medium' | 'low';
}

interface UserStore {
    id: string;
    slug: string;
    name: string;
}

interface TokenData {
    tokenId: string;
    platform: string;
    parsedData: ParsedData;
    imageUrls: string[];
}

export default function BotImportPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const tokenId = searchParams.get('token');

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [tokenData, setTokenData] = useState<TokenData | null>(null);
    const [stores, setStores] = useState<UserStore[]>([]);
    const [selectedStoreId, setSelectedStoreId] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Editable form state (pre-filled from AI parse)
    const [form, setForm] = useState({
        title: '',
        price: '',
        description: '',
        category: 'OTHER',
        stock: '1',
        deliveryFeeMode: 'store' as 'store' | 'free' | 'custom',
        deliveryFeeCustom: '',
        isDigital: false,
        forSale: true,
    });

    useEffect(() => {
        if (!tokenId) {
            setError('No import token provided.');
            setLoading(false);
            return;
        }

        Promise.all([
            fetch(`/api/bot/import?token=${tokenId}`),
            fetch('/api/user/stores'),
        ]).then(async ([tokenRes, storesRes]) => {
                if (tokenRes.status === 401) {
                    window.location.href = `/login?callbackUrl=${encodeURIComponent(window.location.href)}`;
                    return;
                }
                const tokenJson = await tokenRes.json();
                if (!tokenRes.ok) {
                    setError(tokenJson.error || 'This link is invalid or has expired.');
                    return;
                }
                setTokenData(tokenJson);
                setForm({
                    title: tokenJson.parsedData.title || '',
                    price: tokenJson.parsedData.price > 0 ? String(tokenJson.parsedData.price) : '',
                    description: tokenJson.parsedData.description || '',
                    category: tokenJson.parsedData.category || 'OTHER',
                    stock: '1',
                });

                if (storesRes.ok) {
                    const storesJson = await storesRes.json();
                    const storeList: UserStore[] = storesJson.stores || [];
                    setStores(storeList);
                    if (storeList.length === 1) setSelectedStoreId(storeList[0].id);
                }
            })
            .catch(() => setError('Failed to load import data.'))
            .finally(() => setLoading(false));
    }, [tokenId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tokenData) return;

        if (!form.title.trim()) { toast.error('Please enter a product title.'); return; }
        if (!form.price || isNaN(Number(form.price)) || Number(form.price) < 0) {
            toast.error('Please enter a valid price.'); return;
        }
        if (!selectedStoreId) { toast.error('Please select a store.'); return; }

        const selectedStore = stores.find(s => s.id === selectedStoreId);

        setSubmitting(true);
        try {
            const deliveryFee =
                form.deliveryFeeMode === 'free' ? 0
                : form.deliveryFeeMode === 'custom' ? (Number(form.deliveryFeeCustom) || 0)
                : null; // 'store' → inherit

            const res = await fetch('/api/bot/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tokenId: tokenData.tokenId,
                    storeId: selectedStoreId,
                    title: form.title.trim(),
                    description: form.description.trim() || undefined,
                    price: Number(form.price),
                    category: form.category,
                    stock: Number(form.stock) || 1,
                    deliveryFee,
                    isDigital: form.isDigital,
                    inStock: form.forSale,
                    imageUrls: tokenData.imageUrls,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || 'Failed to create listing.');
                return;
            }

            toast.success('Product listed on DepMi!');
            router.push(`/${selectedStore?.slug ?? ''}`);
        } catch {
            toast.error('Something went wrong. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    // ── States ──────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <main style={pageStyle}>
                <div style={cardStyle}>
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>
                        Loading your product…
                    </div>
                </div>
            </main>
        );
    }

    if (error) {
        return (
            <main style={pageStyle}>
                <div style={cardStyle}>
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                        <div style={{ fontSize: '2rem', marginBottom: 12 }}>⚠️</div>
                        <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>Link expired or invalid</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 24 }}>{error}</div>
                        <a href="/" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>Go to DepMi →</a>
                    </div>
                </div>
            </main>
        );
    }

    if (!tokenData) return null;

    const confidence = tokenData.parsedData.confidence;

    return (
        <main style={pageStyle}>
            <div style={cardStyle}>
                {/* Header */}
                <div style={{ marginBottom: 20 }}>
                    <div style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--text-primary)', marginBottom: 4 }}>
                        List on DepMi
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        From {tokenData.platform.charAt(0) + tokenData.platform.slice(1).toLowerCase()}
                    </div>
                </div>

                {/* Image preview */}
                {tokenData.imageUrls.length > 0 && (
                    <div style={{ marginBottom: 16, borderRadius: 12, overflow: 'hidden', maxHeight: 260 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={tokenData.imageUrls[0]}
                            alt="Product"
                            style={{ width: '100%', objectFit: 'cover', display: 'block' }}
                        />
                    </div>
                )}

                {/* AI confidence notice */}
                {confidence === 'low' && (
                    <div style={{
                        padding: '10px 12px', borderRadius: 10, marginBottom: 14,
                        background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.25)',
                        fontSize: '0.78rem', color: '#a16207',
                    }}>
                        ⚠️ The AI wasn&apos;t fully confident about the price — please double-check it below.
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    {/* Store picker — only shown when user has multiple stores */}
                    {stores.length > 1 && (
                        <div style={fieldStyle}>
                            <label style={labelStyle}>List under which store?</label>
                            <select
                                value={selectedStoreId}
                                onChange={(e) => setSelectedStoreId(e.target.value)}
                                style={{ ...inputStyle, cursor: 'pointer' }}
                                required
                            >
                                <option value="">— Select a store —</option>
                                {stores.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Title */}
                    <div style={fieldStyle}>
                        <label style={labelStyle}>Product Name</label>
                        <input
                            type="text"
                            value={form.title}
                            onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                            maxLength={100}
                            style={inputStyle}
                            placeholder="e.g. Ankara Crop Top"
                        />
                    </div>

                    {/* Price */}
                    <div style={fieldStyle}>
                        <label style={labelStyle}>Price (₦)</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>₦</span>
                            <input
                                type="text"
                                inputMode="numeric"
                                value={form.price}
                                onChange={(e) => setForm(f => ({ ...f, price: e.target.value.replace(/\D/g, '') }))}
                                style={{ ...inputStyle, flex: 1 }}
                                placeholder="e.g. 5000"
                            />
                        </div>
                    </div>

                    {/* Category */}
                    <div style={fieldStyle}>
                        <label style={labelStyle}>Category</label>
                        <select
                            value={form.category}
                            onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
                            style={{ ...inputStyle, cursor: 'pointer' }}
                        >
                            {CATEGORIES.map(c => (
                                <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>
                            ))}
                        </select>
                    </div>

                    {/* Description */}
                    <div style={fieldStyle}>
                        <label style={labelStyle}>Description <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(optional)</span></label>
                        <textarea
                            value={form.description}
                            onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                            maxLength={500}
                            rows={3}
                            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
                            placeholder="Tell buyers more about this product…"
                        />
                    </div>

                    {/* Stock */}
                    <div style={fieldStyle}>
                        <label style={labelStyle}>Quantity in stock</label>
                        <input
                            type="text"
                            inputMode="numeric"
                            value={form.stock}
                            onChange={(e) => setForm(f => ({ ...f, stock: e.target.value.replace(/\D/g, '') || '1' }))}
                            style={{ ...inputStyle, maxWidth: 100 }}
                        />
                    </div>

                    {/* Physical / Digital */}
                    <div style={fieldStyle}>
                        <label style={labelStyle}>Product type</label>
                        <div style={{ display: 'flex', gap: 10 }}>
                            {(['Physical', 'Digital'] as const).map(type => {
                                const digital = type === 'Digital';
                                const active = form.isDigital === digital;
                                return (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => setForm(f => ({ ...f, isDigital: digital, deliveryFeeMode: digital ? 'free' : f.deliveryFeeMode }))}
                                        style={{
                                            flex: 1, padding: '10px', borderRadius: 10, fontWeight: 600,
                                            fontSize: '0.88rem', cursor: 'pointer', border: '1.5px solid',
                                            borderColor: active ? 'var(--primary)' : 'var(--border)',
                                            background: active ? 'rgba(255,92,56,0.08)' : 'var(--bg-elevated)',
                                            color: active ? 'var(--primary)' : 'var(--text-muted)',
                                        }}
                                    >{type}</button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Delivery Fee */}
                    {!form.isDigital && (
                        <div style={fieldStyle}>
                            <label style={labelStyle}>Delivery fee</label>
                            {(['store', 'free', 'custom'] as const).map(mode => (
                                <label key={mode} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer' }}>
                                    <input
                                        type="radio"
                                        name="deliveryFeeMode"
                                        checked={form.deliveryFeeMode === mode}
                                        onChange={() => setForm(f => ({ ...f, deliveryFeeMode: mode }))}
                                        style={{ accentColor: 'var(--primary)' }}
                                    />
                                    <span style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                                        {mode === 'store' && 'Use store settings'}
                                        {mode === 'free' && 'Free delivery'}
                                        {mode === 'custom' && 'Custom flat rate'}
                                    </span>
                                </label>
                            ))}
                            {form.deliveryFeeMode === 'custom' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                                    <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>₦</span>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={form.deliveryFeeCustom}
                                        onChange={(e) => setForm(f => ({ ...f, deliveryFeeCustom: e.target.value.replace(/\D/g, '') }))}
                                        style={{ ...inputStyle, flex: 1 }}
                                        placeholder="e.g. 1500"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* For Sale toggle */}
                    <div style={{ ...fieldStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <label style={{ ...labelStyle, marginBottom: 0 }}>List as available for sale</label>
                        <button
                            type="button"
                            onClick={() => setForm(f => ({ ...f, forSale: !f.forSale }))}
                            style={{
                                width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                                background: form.forSale ? 'var(--primary)' : 'var(--border)',
                                position: 'relative', transition: 'background 0.2s',
                            }}
                        >
                            <span style={{
                                position: 'absolute', top: 3, width: 18, height: 18, borderRadius: '50%',
                                background: '#fff', transition: 'left 0.2s',
                                left: form.forSale ? 23 : 3,
                            }} />
                        </button>
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        style={{
                            width: '100%',
                            padding: '14px',
                            borderRadius: 14,
                            background: submitting ? 'rgba(255,92,56,0.5)' : 'var(--primary)',
                            color: '#fff',
                            fontWeight: 800,
                            fontSize: '1rem',
                            border: 'none',
                            cursor: submitting ? 'not-allowed' : 'pointer',
                            letterSpacing: '-0.01em',
                        }}
                    >
                        {submitting ? 'Listing…' : 'List on DepMi'}
                    </button>
                </form>
            </div>
        </main>
    );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = {
    minHeight: '100dvh',
    background: 'var(--bg-color)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: '24px 16px 48px',
};

const cardStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: 480,
    background: 'var(--bg-card)',
    borderRadius: 18,
    border: '1px solid var(--card-border)',
    padding: '24px 20px',
};

const fieldStyle: React.CSSProperties = {
    marginBottom: 16,
};

const labelStyle: React.CSSProperties = {
    display: 'block',
    fontWeight: 600,
    fontSize: '0.85rem',
    color: 'var(--text-primary)',
    marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 10,
    border: '1px solid var(--border)',
    background: 'var(--bg-elevated)',
    color: 'var(--text-primary)',
    fontSize: '0.9rem',
    boxSizing: 'border-box',
};
