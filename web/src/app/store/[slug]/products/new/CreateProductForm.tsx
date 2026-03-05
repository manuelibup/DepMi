'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import CloudinaryUploader, { CloudinaryUploadResult } from '@/components/CloudinaryUploader';
import { X, Tag, FolderOpen } from 'lucide-react';
import styles from './CreateProductForm.module.css';

const CATEGORIES = [
    'FASHION', 'GADGETS', 'BEAUTY', 'FOOD',
    'FURNITURE', 'VEHICLES', 'SERVICES', 'OTHER'
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
        imageUrl: '',
        videoUrl: '',
    });

    const [activeInput, setActiveInput] = useState<'price' | 'category' | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Load draft
    useEffect(() => {
        const draft = localStorage.getItem(`product_draft_${storeId}`);
        if (draft) {
            try {
                const parsed = JSON.parse(draft);
                setForm(prev => ({ ...prev, ...parsed }));
            } catch (e) {}
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
        } else {
            setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
        }
    };

    const handleClose = () => {
        if (form.title || form.description || form.price || form.imageUrl || form.videoUrl) {
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

        setStatus('loading');
        setErrorMsg('');

        const payload = {
            storeId,
            title: form.title,
            description: form.description,
            price: Number(form.price),
            currency: form.currency,
            category: form.category,
            images: form.imageUrl ? [form.imageUrl] : [],
            videoUrl: form.videoUrl || null,
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

    const canPost = form.title.trim().length > 0 && form.price !== '' && status !== 'loading';

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <button type="button" onClick={handleClose} className={styles.iconBtn} aria-label="Cancel">
                    <X size={24} />
                </button>
                <button 
                    type="button" 
                    className={styles.postBtn}
                    disabled={!canPost}
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
                />

                <div className={styles.mediaSection}>
                    {!form.imageUrl && (
                        <CloudinaryUploader 
                            onUploadSuccess={(res: CloudinaryUploadResult) => setForm({ ...form, imageUrl: res.secure_url })} 
                            accept="image/*"
                            maxSizeMB={10} 
                            buttonText="Add Photo" 
                        />
                    )}
                    {form.imageUrl && (
                        <div className={styles.mediaPreview}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={form.imageUrl} alt="Preview" />
                            <button
                                type="button"
                                className={styles.removeBtn}
                                onClick={() => setForm({ ...form, imageUrl: '' })}
                            >
                                ✕
                            </button>
                        </div>
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

            {/* Inline expandable inputs based on active pill */}
            {activeInput === 'price' && (
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
            )}

            {activeInput === 'category' && (
                <div className={styles.inlineInputRow}>
                    <select 
                        name="category" 
                        value={form.category} 
                        onChange={handleChange} 
                        className={styles.categorySelect}
                        autoFocus
                    >
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
                </div>
            </div>
        </div>
    );
}
