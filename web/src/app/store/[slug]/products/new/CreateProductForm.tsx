'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import CloudinaryUploader, { CloudinaryUploadResult } from '@/components/CloudinaryUploader';
import { X, Tag, FolderOpen } from 'lucide-react';
import styles from './CreateProductForm.module.css';

const CATEGORIES = [
    'FASHION', 'GADGETS', 'BEAUTY', 'COSMETICS', 'FOOD',
    'FURNITURE', 'VEHICLES', 'SERVICES', 'TRANSPORT',
    'SPORT', 'HOUSING', 'BOOKS', 'COURSE', 'OTHER'
];
const CURRENCIES = ['₦', '$', '£', '€'];

export default function CreateProductForm({ storeId, storeSlug }: { storeId: string; storeSlug: string }) {
    const router = useRouter();
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');

    const [form, setForm] = useState({
        title: '',
        description: '',
        currency: '₦',
        price: '', // Raw unformatted number string for API
        displayPrice: '', // Formatted string with commas for UI
        category: 'OTHER',
        categoryOther: '',
        imageUrls: [] as string[],
        videoUrl: '',
        stock: '1',
        displayStock: '1',
        deliveryFee: '0',
        displayDeliveryFee: '0',
    });

    const [activeInput, setActiveInput] = useState<'price' | 'category' | 'stock' | 'deliveryFee' | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Load draft
    useEffect(() => {
        const draft = localStorage.getItem(`product_draft_${storeId}`);
        if (draft) {
            try {
                const parsed = JSON.parse(draft);
                setForm(prev => ({ ...prev, ...parsed }));
            } catch (e) { }
        }
    }, [storeId]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [form.description]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        if (e.target.name === 'price') {
            // Remove any non-numeric characters for the raw value
            const rawValue = e.target.value.replace(/\D/g, '');
            // Format with commas for display
            const formattedValue = rawValue ? Number(rawValue).toLocaleString() : '';

            setForm(prev => ({
                ...prev,
                price: rawValue,
                displayPrice: formattedValue
            }));
        } else if (e.target.name === 'stock') {
            const rawValue = e.target.value.replace(/\D/g, '');
            setForm(prev => ({
                ...prev,
                stock: rawValue,
                displayStock: rawValue
            }));
        } else if (e.target.name === 'deliveryFee') {
            const rawValue = e.target.value.replace(/\D/g, '');
            const formattedValue = rawValue ? Number(rawValue).toLocaleString() : '';
            setForm(prev => ({
                ...prev,
                deliveryFee: rawValue,
                displayDeliveryFee: formattedValue
            }));
        } else {
            setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
        }
    };

    const handleClose = () => {
        if (form.title || form.description || form.price || form.imageUrls.length > 0 || form.videoUrl || Number(form.stock) > 1) {
            const save = confirm("Save as draft?");
            if (save) {
                localStorage.setItem(`product_draft_${storeId}`, JSON.stringify(form));
            } else {
                localStorage.removeItem(`product_draft_${storeId}`);
            }
        }
        router.back();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!form.title.trim()) {
            setErrorMsg('Pleae provide a title for your product.');
            return;
        }
        if (!form.price || isNaN(parseFloat(form.price))) {
            setErrorMsg('Please provide a valid price.');
            setActiveInput('price');
            return;
        }
        if (form.imageUrls.length < 3) {
            setErrorMsg('Please add at least 3 images to showcase your product.');
            return;
        }

        setStatus('loading');
        setErrorMsg('');

        const payload = {
            storeId,
            title: form.title,
            description: form.description,
            price: Number(form.price),
            currency: form.currency,
            category: form.category,
            categoryOther: form.category === 'OTHER' ? form.categoryOther || null : null,
            images: form.imageUrls,
            videoUrl: form.videoUrl || null,
            stock: Number(form.stock) || 1,
            deliveryFee: Number(form.deliveryFee) || 0,
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
                    throw new Error(firstError as string || 'Invalid input.');
                } else {
                    throw new Error(data.message || 'Something went wrong.');
                }
            }

            setStatus('success');
            localStorage.removeItem(`product_draft_${storeId}`);
            router.push(`/store/${storeSlug}`);
            router.refresh();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            setStatus('error');
            setErrorMsg(err.message || 'Failed to create product.');
        }
    };

    const canPost = form.title.trim().length > 0 && form.price !== '' && form.imageUrls.length >= 3 && status !== 'loading';

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <button type="button" onClick={handleClose} className={styles.iconBtn} aria-label="Cancel">
                    <X size={24} />
                </button>
                <button
                    type="button"
                    className={styles.postBtn}
                    disabled={status === 'loading'}
                    onClick={handleSubmit}
                >
                    List Item
                </button>
            </div>

            {status === 'error' && (
                <div className={styles.errorBanner}>{errorMsg}</div>
            )}

            <div className={styles.body}>
                <div className={styles.authorRow}>
                    <div className={styles.avatar}>
                        <div className={styles.avatarFallback}>{storeSlug.charAt(0).toUpperCase()}</div>
                    </div>
                    <div className={styles.authorInfo}>
                        <span className={styles.authorName}>{storeSlug}</span>
                        <span className={styles.postVisibility}>Added to your store catalog</span>
                    </div>
                </div>

                <input
                    type="text"
                    name="title"
                    className={styles.titleInput}
                    placeholder="What are you selling?"
                    value={form.title}
                    onChange={handleChange}
                    autoFocus
                />

                <textarea
                    ref={textareaRef}
                    name="description"
                    className={styles.composer}
                    placeholder="Add a description... (optional)"
                    value={form.description}
                    onChange={handleChange}
                    onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleSubmit(e as unknown as React.FormEvent); } }}
                />

                <div className={styles.mediaSection}>
                    {/* Image previews */}
                    {form.imageUrls.length > 0 && (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                            {form.imageUrls.map((url, i) => (
                                <div key={i} className={styles.mediaPreview}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={url} alt={`Photo ${i + 1}`} />
                                    <button
                                        type="button"
                                        className={styles.removeBtn}
                                        onClick={() => setForm(f => ({ ...f, imageUrls: f.imageUrls.filter((_, idx) => idx !== i) }))}
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    {form.imageUrls.length < 10 && (
                        <CloudinaryUploader
                            onUploadSuccess={(res: CloudinaryUploadResult) => setForm(f => ({ ...f, imageUrls: [...f.imageUrls, res.secure_url] }))}
                            accept="image/*"
                            maxSizeMB={10}
                            buttonText={form.imageUrls.length === 0 ? 'Add Photos (Min 3)' : form.imageUrls.length < 3 ? `Add More Photos (${3 - form.imageUrls.length} more needed)` : 'Add More Photos'}
                            cropAspectRatio={1}
                            cropTitle="Crop Photo"
                        />
                    )}

                    {!form.videoUrl && (
                        <CloudinaryUploader
                            onUploadSuccess={(res: CloudinaryUploadResult) => setForm({ ...form, videoUrl: res.secure_url })}
                            accept="video/*"
                            maxSizeMB={100}
                            maxDurationSeconds={60}
                            buttonText="Add Video (Optional)"
                        />
                    )}
                    {form.videoUrl && (
                        <div className={styles.mediaPreview}>
                            <video src={form.videoUrl} controls playsInline />
                            <button
                                type="button"
                                className={styles.removeBtn}
                                onClick={() => setForm({ ...form, videoUrl: '' })}
                            >
                                ✕
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className={styles.hintContainer}>
                <p><strong>Required to list:</strong> Title, Price, Category, Amount Available, and at least 3 photos.</p>
            </div>

            {/* Inline expandable inputs based on active pill */}
            {activeInput === 'price' && (
                <>
                    <div className={styles.inlineInputRow}>
                        <select
                            name="currency"
                            value={form.currency}
                            onChange={handleChange}
                            className={styles.currencySelect}
                        >
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
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '4px 16px 0', lineHeight: 1.4 }}>
                        DepMi charges a 5% success fee on completed sales. Factor this into your price.
                    </p>
                </>
            )}

            {activeInput === 'category' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    <div className={styles.inlineInputRow}>
                        <select
                            name="category"
                            value={form.category}
                            onChange={handleChange}
                            className={styles.categorySelect}
                            autoFocus
                        >
                            {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>)}
                        </select>
                        <button type="button" className={styles.doneBtn} onClick={() => setActiveInput(null)}>Done</button>
                    </div>
                    {form.category === 'OTHER' && (
                        <div className={styles.inlineInputRow} style={{ borderTop: '1px solid var(--border)' }}>
                            <input
                                type="text"
                                name="categoryOther"
                                placeholder="Specify category (e.g. Perfume, Pet supplies…)"
                                value={form.categoryOther}
                                onChange={handleChange}
                                className={styles.inlineInput}
                                maxLength={40}
                            />
                        </div>
                    )}
                </div>
            )}

            {activeInput === 'stock' && (
                <div className={styles.inlineInputRow}>
                    <input
                        type="text"
                        name="stock"
                        inputMode="numeric"
                        placeholder="Available quantity"
                        value={form.displayStock}
                        onChange={handleChange}
                        className={styles.inlineInput}
                        autoFocus
                    />
                    <button type="button" className={styles.doneBtn} onClick={() => setActiveInput(null)}>Done</button>
                </div>
            )}

            {activeInput === 'deliveryFee' && (
                <div className={styles.inlineInputRow}>
                    <span className={styles.inputPrefix}>₦</span>
                    <input
                        type="text"
                        name="deliveryFee"
                        inputMode="numeric"
                        placeholder="Set Delivery Fee"
                        value={form.displayDeliveryFee}
                        onChange={handleChange}
                        className={styles.inlineInput}
                        autoFocus
                    />
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
                        className={`${styles.pill} ${Number(form.stock) > 1 ? styles.pillActive : ''}`}
                        onClick={() => setActiveInput(activeInput === 'stock' ? null : 'stock')}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={styles.pillIcon}>
                            <rect width="8" height="4" x="8" y="2" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M9 12h6" /><path d="M9 16h6" /><path d="M9 8h6" />
                        </svg>
                        {form.stock ? `${form.stock} In Stock` : 'Stock'}
                    </button>

                    <button
                        type="button"
                        className={`${styles.pill} ${form.deliveryFee !== '0' ? styles.pillActive : ''}`}
                        onClick={() => setActiveInput(activeInput === 'deliveryFee' ? null : 'deliveryFee')}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={styles.pillIcon}>
                            <rect width="16" height="12" x="4" y="9" rx="2" ry="2" /><path d="M9 22v-4h6v4" /><path d="M20 9V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v5" /><circle cx="12" cy="14" r="2" />
                        </svg>
                        {form.deliveryFee && form.deliveryFee !== '0' ? `₦${form.displayDeliveryFee} Ship` : 'Delivery Fee'}
                    </button>
                </div>
            </div>
        </div>
    );
}
