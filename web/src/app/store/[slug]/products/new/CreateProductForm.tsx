'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import CloudinaryUploader, { CloudinaryUploadResult } from '@/components/CloudinaryUploader';
import { X } from 'lucide-react';
import styles from './CreateProductForm.module.css';

const CATEGORIES = [
    'FASHION', 'GADGETS', 'BEAUTY', 'COSMETICS', 'FOOD',
    'FURNITURE', 'VEHICLES', 'SERVICES', 'TRANSPORT',
    'SPORT', 'HOUSING', 'BOOKS', 'COURSE', 'OTHER'
];
const CURRENCIES = ['₦', '$', '£', '€'];

interface CreateProductFormProps {
    storeId: string;
    storeSlug: string;
    localDeliveryFee: number | null;
    nationwideDeliveryFee: number | null;
    storeState: string | null;
}

export default function CreateProductForm({ storeId, storeSlug, localDeliveryFee, nationwideDeliveryFee, storeState }: CreateProductFormProps) {
    const router = useRouter();
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

    // deliveryFeeMode: 'store' = use store local/nationwide rates, 'free' = ₦0, 'custom' = flat rate
    const hasStoreFees = localDeliveryFee !== null || nationwideDeliveryFee !== null;
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
        deliveryFeeMode: hasStoreFees ? 'store' : 'free' as 'store' | 'free',
        deliveryFee: '0',
        displayDeliveryFee: '0',
        isPortfolioItem: false,
        isDigital: false,
        fileUrl: '',
    });

    const [activeInput, setActiveInput] = useState<'price' | 'category' | 'stock' | 'deliveryFee' | 'variants' | null>(null);
    const [variants, setVariants] = useState<{ name: string; price: string; stock: string }[]>([]);
    const [productType, setProductType] = useState<'physical' | 'digital' | null>(null);
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

        const hasVariants = variants.length > 0;

        if (!form.title.trim()) {
            toast.error('Please provide a title for your product.');
            return;
        }
        if (!hasVariants && (!form.price || isNaN(parseFloat(form.price)))) {
            toast.error('Please provide a price or add variants with individual prices.');
            setActiveInput('price');
            return;
        }
        if (hasVariants && variants.some(v => !v.name.trim() || !v.price || isNaN(Number(v.price)))) {
            toast.error('Each variant needs a name and price.');
            setActiveInput('variants');
            return;
        }
        if (form.imageUrls.length < 1) {
            toast.error('Please add at least 1 image to showcase your product.');
            return;
        }

        setStatus('loading');

        const payload = {
            storeId,
            title: form.title,
            description: form.description,
            price: hasVariants ? 0 : Number(form.price),
            currency: form.currency,
            category: form.category,
            categoryOther: form.category === 'OTHER' ? form.categoryOther || null : null,
            images: form.imageUrls,
            videoUrl: form.videoUrl || null,
            stock: hasVariants ? variants.reduce((s, v) => s + (Number(v.stock) || 1), 0) : (Number(form.stock) || 1),
            deliveryFee: form.isDigital ? 0 : (form.deliveryFeeMode === 'store' ? null : 0),
            isPortfolioItem: form.isPortfolioItem,
            isDigital: form.isDigital,
            fileUrl: form.isDigital ? (form.fileUrl || null) : null,
            variants: hasVariants ? variants.map(v => ({ name: v.name.trim(), price: Number(v.price), stock: Number(v.stock) || 1 })) : undefined,
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
            toast.success('Product listed!');
            router.push(`/store/${storeSlug}`);
            router.refresh();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            setStatus('error');
            toast.error(err.message || 'Failed to create product.');
        }
    };

    const hasVariants = variants.length > 0;
    const canPost = productType !== null && form.title.trim().length > 0 && (hasVariants || form.price !== '') && form.imageUrls.length >= 1 && status !== 'loading';

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <button type="button" onClick={handleClose} className={styles.iconBtn} aria-label="Cancel">
                    <X size={24} />
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {productType && (
                        <a href={`/store/${storeSlug}/products/import`} style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>
                            Import
                        </a>
                    )}
                    <button
                        type="button"
                        className={styles.postBtn}
                        disabled={!canPost}
                        onClick={handleSubmit}
                    >
                        {status === 'loading' ? 'Listing…' : 'List Item'}
                    </button>
                </div>
            </div>

            {/* ── Type picker ── */}
            {!productType ? (
                <div className={styles.typePicker}>
                    <p className={styles.typePickerLabel}>What are you listing?</p>
                    <p className={styles.typePickerSub}>Choose a type to get started</p>
                    <div className={styles.typeCards}>
                        <button
                            type="button"
                            className={styles.typeCard}
                            onClick={() => { setProductType('physical'); setForm(f => ({ ...f, isDigital: false })); }}
                        >
                            <span className={styles.typeCardIcon}>📦</span>
                            <span className={styles.typeCardTitle}>Physical</span>
                            <span className={styles.typeCardDesc}>Items you ship or hand-deliver to buyers</span>
                        </button>
                        <button
                            type="button"
                            className={styles.typeCard}
                            onClick={() => { setProductType('digital'); setForm(f => ({ ...f, isDigital: true })); }}
                        >
                            <span className={styles.typeCardIcon}>⚡</span>
                            <span className={styles.typeCardTitle}>Digital</span>
                            <span className={styles.typeCardDesc}>Files, courses, or instant downloads</span>
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    <div className={styles.body}>
                        <div className={styles.authorRow}>
                            <div className={styles.avatar}>
                                <div className={styles.avatarFallback}>{storeSlug.charAt(0).toUpperCase()}</div>
                            </div>
                            <div className={styles.authorInfo}>
                                <span className={styles.authorName}>{storeSlug}</span>
                                <span className={styles.postVisibility}>{form.isDigital ? '⚡ Digital product' : '📦 Physical product'}</span>
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

                        {/* Digital file upload */}
                        {form.isDigital && (
                            <div style={{ margin: '0 0 12px' }}>
                                {form.fileUrl ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)' }}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                                        </svg>
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

                        {/* Horizontal media strip */}
                        <div className={styles.mediaStrip}>
                            {/* Uploaded image thumbnails */}
                            {form.imageUrls.map((url, i) => (
                                <div key={i} className={styles.mediaThumbnail}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={url} alt={`Photo ${i + 1}`} />
                                    <button type="button" className={styles.removeThumb} onClick={() => setForm(f => ({ ...f, imageUrls: f.imageUrls.filter((_, idx) => idx !== i) }))}>✕</button>
                                </div>
                            ))}

                            {/* Video preview thumbnail */}
                            {form.videoUrl && (
                                <div className={styles.mediaThumbnail}>
                                    <video src={form.videoUrl} playsInline muted />
                                    <button type="button" className={styles.removeThumb} onClick={() => setForm(f => ({ ...f, videoUrl: '' }))}>✕</button>
                                </div>
                            )}

                            {/* Add photos button */}
                            {form.imageUrls.length < 10 && (
                                <CloudinaryUploader
                                    accept="image/*"
                                    maxSizeMB={10}
                                    multiple
                                    onUploadSuccess={(res: CloudinaryUploadResult) => setForm(f => ({ ...f, imageUrls: [...f.imageUrls, res.secure_url] }))}
                                    renderTrigger={({ onClick, isUploading, progress }) =>
                                        isUploading ? (
                                            <div className={styles.uploadingThumb}>
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                                                <span>{progress}%</span>
                                            </div>
                                        ) : (
                                            <button type="button" className={styles.addMediaBtn} onClick={onClick}>
                                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                                                <span>Photos</span>
                                            </button>
                                        )
                                    }
                                />
                            )}

                            {/* Add video button */}
                            {!form.videoUrl && (
                                <CloudinaryUploader
                                    accept="video/*"
                                    maxSizeMB={100}
                                    maxDurationSeconds={60}
                                    onUploadSuccess={(res: CloudinaryUploadResult) => setForm(f => ({ ...f, videoUrl: res.secure_url }))}
                                    renderTrigger={({ onClick, isUploading, progress }) =>
                                        isUploading ? (
                                            <div className={styles.uploadingThumb}>
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                                                <span>{progress}%</span>
                                            </div>
                                        ) : (
                                            <button type="button" className={styles.addMediaBtn} onClick={onClick}>
                                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 8-6 4 6 4V8z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg>
                                                <span>Video</span>
                                            </button>
                                        )
                                    }
                                />
                            )}
                        </div>
                    </div>

                    <div className={styles.hintContainer}>
                        <p><strong>Required:</strong> Title, Price, Category, Qty, and at least 1 photo.</p>
                    </div>

                    {/* Inline expandable panels */}
                    {activeInput === 'price' && (
                        <>
                            <div className={styles.inlineInputRow}>
                                <select name="currency" value={form.currency} onChange={handleChange} className={styles.currencySelect}>
                                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <input type="text" name="price" inputMode="numeric" placeholder="Price amount" value={form.displayPrice} onChange={handleChange} className={styles.inlineInput} autoFocus />
                                <button type="button" className={styles.doneBtn} onClick={() => setActiveInput(null)}>Done</button>
                            </div>
                            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '4px 16px 8px', lineHeight: 1.4 }}>
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
                                    <input type="text" name="categoryOther" placeholder="Specify category (e.g. Perfume, Pet supplies…)" value={form.categoryOther} onChange={handleChange} className={styles.inlineInput} maxLength={40} />
                                </div>
                            )}
                        </div>
                    )}

                    {activeInput === 'stock' && (
                        <div style={{ borderTop: '1px solid var(--border)' }}>
                            <div className={styles.inlineInputRow}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)', flexShrink: 0 }}><rect width="8" height="4" x="8" y="2" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M9 12h6" /><path d="M9 16h6" /><path d="M9 8h6" /></svg>
                                <input type="text" name="stock" inputMode="numeric" placeholder="How many do you have to sell?" value={form.displayStock} onChange={handleChange} className={styles.inlineInput} autoFocus />
                                <button type="button" className={styles.doneBtn} onClick={() => setActiveInput(null)}>Done</button>
                            </div>
                            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 16px 8px', lineHeight: 1.4 }}>
                                Buyers will see how many units are left. Leave at 1 if you only have one item.
                            </p>
                        </div>
                    )}

                    {activeInput === 'deliveryFee' && !form.isDigital && (
                        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
                            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12, cursor: 'pointer' }}>
                                <input type="radio" name="deliveryFeeMode" value="store" checked={form.deliveryFeeMode === 'store'} onChange={() => setForm(f => ({ ...f, deliveryFeeMode: 'store' }))} style={{ marginTop: 3, accentColor: 'var(--primary)', flexShrink: 0 }} />
                                <div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Use store delivery rates</div>
                                    {hasStoreFees ? (
                                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                            {storeState ? `Local (${storeState}): ` : 'Local: '}{localDeliveryFee !== null ? `₦${localDeliveryFee.toLocaleString()}` : 'not set'}{' · '}Nationwide: {nationwideDeliveryFee !== null ? `₦${nationwideDeliveryFee.toLocaleString()}` : 'not set'}
                                        </div>
                                    ) : (
                                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                            No rates set yet —{' '}<a href={`/store/${storeSlug}/settings#delivery`} style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>add them in Store Settings</a>
                                        </div>
                                    )}
                                </div>
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                                <input type="radio" name="deliveryFeeMode" value="free" checked={form.deliveryFeeMode === 'free'} onChange={() => setForm(f => ({ ...f, deliveryFeeMode: 'free' }))} style={{ accentColor: 'var(--primary)', flexShrink: 0 }} />
                                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Free delivery for this product</div>
                            </label>
                            <button type="button" className={styles.doneBtn} onClick={() => setActiveInput(null)} style={{ marginTop: 14, width: '100%' }}>Done</button>
                        </div>
                    )}

                    {activeInput === 'variants' && (
                        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
                            <p style={{ margin: '0 0 10px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Each variant has its own name, price and qty (e.g. Size S / Size M).</p>
                            {variants.map((v, i) => (
                                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                                    <input type="text" placeholder="Name (e.g. Size L)" value={v.name} onChange={e => setVariants(prev => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} style={{ flex: 2, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: '0.85rem' }} />
                                    <input type="text" inputMode="numeric" placeholder="Price" value={v.price} onChange={e => setVariants(prev => prev.map((x, j) => j === i ? { ...x, price: e.target.value.replace(/\D/g, '') } : x))} style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: '0.85rem' }} />
                                    <input type="text" inputMode="numeric" placeholder="Qty" value={v.stock} onChange={e => setVariants(prev => prev.map((x, j) => j === i ? { ...x, stock: e.target.value.replace(/\D/g, '') } : x))} style={{ width: 52, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: '0.85rem' }} />
                                    <button type="button" onClick={() => setVariants(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, lineHeight: 1 }}><X size={16} /></button>
                                </div>
                            ))}
                            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                                <button type="button" onClick={() => setVariants(prev => [...prev, { name: '', price: '', stock: '1' }])} style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1px dashed var(--primary)', background: 'rgba(255,92,56,0.06)', color: 'var(--primary)', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>+ Add variant</button>
                                <button type="button" className={styles.doneBtn} onClick={() => setActiveInput(null)}>Done</button>
                            </div>
                        </div>
                    )}

                    {/* Action grid */}
                    <div className={styles.actionBar}>
                        <div className={styles.actionGrid}>
                            {/* Price / Variants price */}
                            <button type="button" className={`${styles.actionCell} ${(form.price || hasVariants) ? styles.actionCellActive : ''}`} onClick={() => { setActiveInput(activeInput === 'price' ? null : 'price'); }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                                <span>{hasVariants ? 'Prices vary' : form.price ? `${form.currency}${form.displayPrice}` : 'Price'}</span>
                            </button>

                            {/* Category */}
                            <button type="button" className={`${styles.actionCell} ${form.category !== 'OTHER' ? styles.actionCellActive : ''}`} onClick={() => setActiveInput(activeInput === 'category' ? null : 'category')}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                                <span>{form.category === 'OTHER' ? 'Category' : form.category.charAt(0) + form.category.slice(1).toLowerCase()}</span>
                            </button>

                            {/* Qty in stock */}
                            <button type="button" className={`${styles.actionCell} ${form.stock ? styles.actionCellActive : ''}`} onClick={() => setActiveInput(activeInput === 'stock' ? null : 'stock')}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 12h6"/><path d="M9 16h6"/></svg>
                                <span>{form.stock ? `${form.stock} in stock` : 'Qty'}</span>
                            </button>

                            {/* Variants */}
                            <button type="button" className={`${styles.actionCell} ${hasVariants ? styles.actionCellActive : ''}`} onClick={() => { setActiveInput(activeInput === 'variants' ? null : 'variants'); if (!variants.length) setVariants([{ name: '', price: '', stock: '1' }]); }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                                <span>{hasVariants ? `${variants.length} variant${variants.length > 1 ? 's' : ''}` : 'Variants'}</span>
                            </button>

                            {/* Delivery / File upload */}
                            {form.isDigital ? (
                                <button type="button" className={`${styles.actionCell} ${form.fileUrl ? styles.actionCellActive : ''}`} onClick={() => {}}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                    <span>{form.fileUrl ? 'File ready' : 'Upload file'}</span>
                                </button>
                            ) : (
                                <button type="button" className={`${styles.actionCell} ${styles.actionCellActive}`} onClick={() => setActiveInput(activeInput === 'deliveryFee' ? null : 'deliveryFee')}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="12" x="4" y="9" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M20 9V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v5"/></svg>
                                    <span>{form.deliveryFeeMode === 'free' ? 'Free ship' : 'Delivery'}</span>
                                </button>
                            )}

                            {/* For Sale / Portfolio */}
                            <button type="button" className={`${styles.actionCell} ${form.isPortfolioItem ? styles.actionCellActive : ''}`} onClick={() => setForm(f => ({ ...f, isPortfolioItem: !f.isPortfolioItem }))}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="7" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
                                <span>{form.isPortfolioItem ? 'Portfolio' : 'For Sale'}</span>
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
