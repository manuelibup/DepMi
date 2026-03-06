'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CloudinaryUploader, { CloudinaryUploadResult } from '@/components/CloudinaryUploader';
import { X, Tag, FolderOpen, Package, Briefcase } from 'lucide-react';
import styles from '../../new/CreateProductForm.module.css';

const CATEGORIES = [
    'FASHION', 'GADGETS', 'BEAUTY', 'FOOD',
    'FURNITURE', 'VEHICLES', 'SERVICES', 'OTHER'
];
const CURRENCIES = ['₦', '$', '£', '€'];

interface ProductData {
    id: string;
    title: string;
    description: string;
    price: number;
    currency: string;
    category: string;
    imageUrl: string;
    videoUrl: string;
    inStock: boolean;
    isPortfolioItem: boolean;
}

export default function EditProductForm({ product, storeSlug }: { product: ProductData; storeSlug: string }) {
    const router = useRouter();
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const rawPrice = String(product.price);
    const [form, setForm] = useState({
        title: product.title,
        description: product.description,
        currency: product.currency,
        price: rawPrice,
        displayPrice: Number(rawPrice).toLocaleString(),
        category: product.category,
        imageUrl: product.imageUrl,
        videoUrl: product.videoUrl,
        inStock: product.inStock,
        isPortfolioItem: product.isPortfolioItem,
    });

    const [activeInput, setActiveInput] = useState<'price' | 'category' | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [form.description]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        if (e.target.name === 'price') {
            const rawValue = e.target.value.replace(/\D/g, '');
            const formattedValue = rawValue ? Number(rawValue).toLocaleString() : '';
            setForm(prev => ({ ...prev, price: rawValue, displayPrice: formattedValue }));
        } else {
            setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!form.title.trim()) {
            setErrorMsg('Please provide a title.');
            return;
        }
        if (!form.price || isNaN(parseFloat(form.price))) {
            setErrorMsg('Please provide a valid price.');
            setActiveInput('price');
            return;
        }

        setStatus('loading');
        setErrorMsg('');

        try {
            const res = await fetch(`/api/products/${product.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: form.title,
                    description: form.description,
                    price: Number(form.price),
                    currency: form.currency,
                    category: form.category,
                    imageUrl: form.imageUrl,
                    videoUrl: form.videoUrl || null,
                    inStock: form.inStock,
                    isPortfolioItem: form.isPortfolioItem,
                }),
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.message || 'Failed to update product.');

            setStatus('success');
            router.push(`/store/${storeSlug}`);
            router.refresh();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            setStatus('error');
            setErrorMsg(err.message || 'Something went wrong.');
        }
    };

    const handleDelete = async () => {
        setStatus('loading');
        try {
            const res = await fetch(`/api/products/${product.id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete product.');
            router.push(`/store/${storeSlug}`);
            router.refresh();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            setStatus('error');
            setErrorMsg(err.message || 'Delete failed.');
            setShowDeleteConfirm(false);
        }
    };

    const canSave = form.title.trim().length > 0 && form.price !== '' && status !== 'loading';

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <button type="button" onClick={() => router.back()} className={styles.iconBtn} aria-label="Cancel">
                    <X size={24} />
                </button>
                <span style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-main)' }}>Edit Product</span>
                <button
                    type="button"
                    className={styles.postBtn}
                    disabled={!canSave}
                    onClick={handleSubmit}
                >
                    {status === 'loading' ? 'Saving…' : 'Save'}
                </button>
            </div>

            {status === 'error' && (
                <div className={styles.errorBanner}>{errorMsg}</div>
            )}

            <div className={styles.body}>
                <input
                    type="text"
                    name="title"
                    className={styles.titleInput}
                    placeholder="Product title"
                    value={form.title}
                    onChange={handleChange}
                    autoFocus
                />

                <textarea
                    ref={textareaRef}
                    name="description"
                    className={styles.composer}
                    placeholder="Description (optional)"
                    value={form.description}
                    onChange={handleChange}
                />

                <div className={styles.mediaSection}>
                    {!form.imageUrl ? (
                        <CloudinaryUploader
                            onUploadSuccess={(res: CloudinaryUploadResult) => setForm(f => ({ ...f, imageUrl: res.secure_url }))}
                            accept="image/*"
                            maxSizeMB={10}
                            buttonText="Add Photo"
                        />
                    ) : (
                        <div className={styles.mediaPreview}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={form.imageUrl} alt="Preview" />
                            <button
                                type="button"
                                className={styles.removeBtn}
                                onClick={() => setForm(f => ({ ...f, imageUrl: '' }))}
                            >
                                ✕
                            </button>
                        </div>
                    )}

                    {!form.videoUrl ? (
                        <CloudinaryUploader
                            onUploadSuccess={(res: CloudinaryUploadResult) => setForm(f => ({ ...f, videoUrl: res.secure_url }))}
                            accept="video/*"
                            maxSizeMB={100}
                            maxDurationSeconds={60}
                            buttonText="Add Video (Optional)"
                        />
                    ) : (
                        <div className={styles.mediaPreview}>
                            <video src={form.videoUrl} controls playsInline />
                            <button
                                type="button"
                                className={styles.removeBtn}
                                onClick={() => setForm(f => ({ ...f, videoUrl: '' }))}
                            >
                                ✕
                            </button>
                        </div>
                    )}
                </div>

                {/* Delete zone */}
                {!showDeleteConfirm ? (
                    <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(true)}
                        style={{
                            marginTop: 'auto',
                            background: 'transparent',
                            border: '1px solid var(--danger, #ff3b30)',
                            color: 'var(--danger, #ff3b30)',
                            borderRadius: '12px',
                            padding: '10px 16px',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            width: '100%',
                        }}
                    >
                        Delete Product
                    </button>
                ) : (
                    <div style={{ marginTop: 'auto', background: 'rgba(255,59,48,0.08)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255,59,48,0.2)' }}>
                        <p style={{ margin: '0 0 12px', fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 500 }}>
                            Delete this product permanently?
                        </p>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={status === 'loading'}
                                style={{ flex: 1, background: 'var(--danger, #ff3b30)', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px', fontWeight: 700, cursor: 'pointer' }}
                            >
                                Yes, Delete
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowDeleteConfirm(false)}
                                style={{ flex: 1, background: 'var(--bg-elevated)', color: 'var(--text-main)', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '10px', fontWeight: 600, cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Inline expandable inputs */}
            {activeInput === 'price' && (
                <div className={styles.inlineInputRow}>
                    <select name="currency" value={form.currency} onChange={handleChange} className={styles.currencySelect}>
                        {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input
                        type="text"
                        name="price"
                        inputMode="numeric"
                        placeholder="Price amount"
                        value={form.displayPrice}
                        onChange={handleChange}
                        className={styles.inlineInput}
                        autoFocus
                    />
                    <button type="button" className={styles.doneBtn} onClick={() => setActiveInput(null)}>Done</button>
                </div>
            )}

            {activeInput === 'category' && (
                <div className={styles.inlineInputRow}>
                    <select name="category" value={form.category} onChange={handleChange} className={styles.categorySelect} autoFocus>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <button type="button" className={styles.doneBtn} onClick={() => setActiveInput(null)}>Done</button>
                </div>
            )}

            {/* Bottom action bar */}
            <div className={styles.actionBar}>
                <div className={styles.pillsScroll}>
                    <button
                        type="button"
                        className={`${styles.pill} ${form.price ? styles.pillActive : ''}`}
                        onClick={() => setActiveInput(activeInput === 'price' ? null : 'price')}
                    >
                        <Tag size={16} className={styles.pillIcon} />
                        {form.price ? `${form.currency}${form.displayPrice}` : 'Price'}
                    </button>

                    <button
                        type="button"
                        className={`${styles.pill} ${form.category !== 'OTHER' ? styles.pillActive : ''}`}
                        onClick={() => setActiveInput(activeInput === 'category' ? null : 'category')}
                    >
                        <FolderOpen size={16} className={styles.pillIcon} />
                        {form.category === 'OTHER' ? 'Category' : form.category}
                    </button>

                    <button
                        type="button"
                        className={`${styles.pill} ${form.inStock ? styles.pillActive : ''}`}
                        onClick={() => setForm(f => ({ ...f, inStock: !f.inStock }))}
                    >
                        <Package size={16} className={styles.pillIcon} />
                        {form.inStock ? 'In Stock' : 'Out of Stock'}
                    </button>

                    <button
                        type="button"
                        className={`${styles.pill} ${form.isPortfolioItem ? styles.pillActive : ''}`}
                        onClick={() => setForm(f => ({ ...f, isPortfolioItem: !f.isPortfolioItem }))}
                    >
                        <Briefcase size={16} className={styles.pillIcon} />
                        {form.isPortfolioItem ? 'Portfolio' : 'For Sale'}
                    </button>
                </div>
            </div>
        </div>
    );
}
