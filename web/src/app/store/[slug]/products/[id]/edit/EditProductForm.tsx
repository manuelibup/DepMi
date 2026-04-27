'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CloudinaryUploader, { CloudinaryUploadResult } from '@/components/CloudinaryUploader';
import { X, Tag, FolderOpen, Package, Briefcase, Truck, Download } from 'lucide-react';
import styles from '../../new/CreateProductForm.module.css';

const CATEGORIES = [
    'FASHION', 'GADGETS', 'BEAUTY', 'COSMETICS', 'FOOD',
    'FURNITURE', 'VEHICLES', 'SERVICES', 'TRANSPORT',
    'SPORT', 'HOUSING', 'BOOKS', 'COURSE', 'OTHER'
];
const CURRENCIES = ['₦', '$', '£', '€'];

interface ProductVariant {
    id?: string;
    name: string;
    price: string;
    stock: string;
}

interface ProductData {
    id: string;
    title: string;
    description: string;
    price: number;
    currency: string;
    category: string;
    categoryOther?: string | null;
    imageUrl: string;
    imageUrls?: string[];
    videoUrl: string;
    inStock: boolean;
    isPortfolioItem: boolean;
    deliveryFee: number;
    isDigital: boolean;
    fileUrl: string | null;
    stock: number;
    variants?: ProductVariant[];
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
        categoryOther: product.categoryOther ?? '',
        imageUrls: product.imageUrls ?? (product.imageUrl ? [product.imageUrl] : []),
        videoUrl: product.videoUrl,
        inStock: product.inStock,
        isPortfolioItem: product.isPortfolioItem,
        deliveryFee: String(product.deliveryFee),
        displayDeliveryFee: Number(product.deliveryFee).toLocaleString(),
        isDigital: product.isDigital,
        fileUrl: product.fileUrl ?? '',
    });

    const [variants, setVariants] = useState<ProductVariant[]>(
        (product.variants ?? []).map(v => ({ id: v.id, name: v.name, price: v.price, stock: v.stock }))
    );
    const [stock, setStock] = useState(String(product.stock ?? 1));
    const [activeInput, setActiveInput] = useState<'price' | 'category' | 'deliveryFee' | 'variants' | 'stock' | null>(null);
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
        } else if (e.target.name === 'deliveryFee') {
            const rawValue = e.target.value.replace(/\D/g, '');
            const formattedValue = rawValue ? Number(rawValue).toLocaleString() : '';
            setForm(prev => ({ ...prev, deliveryFee: rawValue, displayDeliveryFee: formattedValue }));
        } else {
            setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const hasVariants = variants.length > 0;

        if (!form.title.trim()) {
            setErrorMsg('Please provide a title.');
            return;
        }
        if (!hasVariants && (!form.price || isNaN(parseFloat(form.price)))) {
            setErrorMsg('Please provide a price or add variants with individual prices.');
            setActiveInput('price');
            return;
        }
        if (hasVariants && variants.some(v => !v.name.trim() || !v.price || isNaN(Number(v.price)))) {
            setErrorMsg('Each variant needs a name and price.');
            setActiveInput('variants');
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
                    price: hasVariants ? 0 : Number(form.price),
                    currency: form.currency,
                    category: form.category,
                    categoryOther: form.category === 'OTHER' ? form.categoryOther || null : null,
                    images: form.imageUrls,
                    videoUrl: form.videoUrl || null,
                    inStock: form.inStock,
                    isPortfolioItem: form.isPortfolioItem,
                    deliveryFee: form.isDigital ? 0 : (Number(form.deliveryFee) || 0),
                    isDigital: form.isDigital,
                    fileUrl: form.isDigital ? (form.fileUrl || null) : null,
                    stock: hasVariants
                        ? variants.reduce((s, v) => s + (Number(v.stock) || 1), 0)
                        : (Number(stock) || 1),
                    variants: hasVariants
                        ? variants.map(v => ({ name: v.name.trim(), price: Number(v.price), stock: Number(v.stock) || 1 }))
                        : [],
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

                {form.isDigital && (
                    <div style={{ margin: '8px 0' }}>
                        {form.fileUrl ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)' }}>
                                <Download size={16} color="var(--primary)" style={{ flexShrink: 0 }} />
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {decodeURIComponent(form.fileUrl.split('/').pop() ?? 'File uploaded')}
                                </span>
                                <button type="button" onClick={() => setForm(f => ({ ...f, fileUrl: '' }))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, lineHeight: 1 }}>
                                    <X size={14} />
                                </button>
                            </div>
                        ) : (
                            <CloudinaryUploader
                                accept=".pdf,.doc,.docx,.zip,.epub,.mp3,.pptx,.xlsx,.txt"
                                maxSizeMB={50}
                                buttonText="Upload Digital File (PDF, ZIP, DOCX…)"
                                onUploadSuccess={(res: CloudinaryUploadResult) => setForm(f => ({ ...f, fileUrl: res.secure_url }))}
                            />
                        )}
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                            Buyers get instant access after payment. Max 50 MB.
                        </p>
                    </div>
                )}

                <div className={styles.mediaSection}>
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
                            multiple
                            buttonText={form.imageUrls.length === 0 ? 'Add Photos' : 'Add More Photos'}
                        />
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
                <>
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
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '4px 16px 0', lineHeight: 1.4 }}>
                        DepMi charges a 5% success fee on completed sales. Factor this into your price.
                    </p>
                </>
            )}

            {activeInput === 'category' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    <div className={styles.inlineInputRow}>
                        <select name="category" value={form.category} onChange={handleChange} className={styles.categorySelect} autoFocus>
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

            {activeInput === 'stock' && (
                <div className={styles.inlineInputRow}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                        <rect width="8" height="4" x="8" y="2" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M9 12h6" /><path d="M9 16h6" /><path d="M9 8h6" />
                    </svg>
                    <input
                        type="text"
                        inputMode="numeric"
                        placeholder="How many do you have to sell?"
                        value={stock}
                        onChange={e => setStock(e.target.value.replace(/\D/g, ''))}
                        className={styles.inlineInput}
                        autoFocus
                    />
                    <button type="button" className={styles.doneBtn} onClick={() => setActiveInput(null)}>Done</button>
                </div>
            )}

            {activeInput === 'variants' && (
                <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
                    <p style={{ margin: '0 0 10px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Each variant has its own name, price and stock. Removes the single price field.
                    </p>
                    {variants.map((v, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                            <input
                                type="text"
                                placeholder="Name (e.g. Size L)"
                                value={v.name}
                                onChange={e => setVariants(prev => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                                style={{ flex: 2, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                            />
                            <input
                                type="text"
                                inputMode="numeric"
                                placeholder="Price"
                                value={v.price}
                                onChange={e => setVariants(prev => prev.map((x, j) => j === i ? { ...x, price: e.target.value.replace(/\D/g, '') } : x))}
                                style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                            />
                            <input
                                type="text"
                                inputMode="numeric"
                                placeholder="Qty"
                                value={v.stock}
                                onChange={e => setVariants(prev => prev.map((x, j) => j === i ? { ...x, stock: e.target.value.replace(/\D/g, '') } : x))}
                                style={{ width: 52, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                            />
                            <button type="button" onClick={() => setVariants(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, lineHeight: 1 }}>
                                <X size={16} />
                            </button>
                        </div>
                    ))}
                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                        <button type="button" onClick={() => setVariants(prev => [...prev, { name: '', price: '', stock: '1' }])} style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1px dashed var(--primary)', background: 'rgba(255,92,56,0.06)', color: 'var(--primary)', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
                            + Add variant
                        </button>
                        <button type="button" className={styles.doneBtn} onClick={() => setActiveInput(null)}>Done</button>
                    </div>
                </div>
            )}

            {/* Bottom action bar */}
            <div className={styles.actionBar}>
                <div className={styles.pillsScroll}>
                    {variants.length === 0 && (
                        <button
                            type="button"
                            className={`${styles.pill} ${form.price ? styles.pillActive : ''}`}
                            onClick={() => setActiveInput(activeInput === 'price' ? null : 'price')}
                        >
                            <Tag size={16} className={styles.pillIcon} />
                            {form.price ? `${form.currency}${form.displayPrice}` : 'Price'}
                        </button>
                    )}

                    <button
                        type="button"
                        className={`${styles.pill} ${variants.length > 0 ? styles.pillActive : ''}`}
                        onClick={() => {
                            setActiveInput(activeInput === 'variants' ? null : 'variants');
                            if (!variants.length) setVariants([{ name: '', price: '', stock: '1' }]);
                        }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={styles.pillIcon}><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                        {variants.length > 0 ? `${variants.length} Variant${variants.length > 1 ? 's' : ''}` : 'Variants'}
                    </button>

                    <button
                        type="button"
                        className={`${styles.pill} ${form.category !== 'OTHER' ? styles.pillActive : ''}`}
                        onClick={() => setActiveInput(activeInput === 'category' ? null : 'category')}
                    >
                        <FolderOpen size={16} className={styles.pillIcon} />
                        {form.category === 'OTHER' ? 'Category' : form.category}
                    </button>

                    {variants.length === 0 && (
                        <button
                            type="button"
                            className={`${styles.pill} ${Number(stock) > 0 ? styles.pillActive : ''}`}
                            onClick={() => setActiveInput(activeInput === 'stock' ? null : 'stock')}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={styles.pillIcon}>
                                <rect width="8" height="4" x="8" y="2" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M9 12h6" /><path d="M9 16h6" /><path d="M9 8h6" />
                            </svg>
                            {stock ? `${stock} available` : 'Qty Available'}
                        </button>
                    )}

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

                    {!form.isDigital && (
                        <button
                            type="button"
                            className={`${styles.pill} ${form.deliveryFee ? styles.pillActive : ''}`}
                            onClick={() => setActiveInput(activeInput === 'deliveryFee' ? null : 'deliveryFee')}
                        >
                            <Truck size={16} className={styles.pillIcon} />
                            {form.deliveryFee ? `₦${form.displayDeliveryFee} Ship` : 'Delivery Fee'}
                        </button>
                    )}

                    <button
                        type="button"
                        className={`${styles.pill} ${form.isDigital ? styles.pillActive : ''}`}
                        onClick={() => setForm(f => ({ ...f, isDigital: !f.isDigital, fileUrl: '' }))}
                        title="Digital products are delivered as a file link — no shipping required"
                    >
                        <Download size={16} className={styles.pillIcon} />
                        {form.isDigital ? 'Digital' : 'Physical'}
                    </button>
                </div>
            </div>
        </div>
    );
}
