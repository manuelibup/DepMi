'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import CloudinaryUploader, { CloudinaryUploadResult } from '@/components/CloudinaryUploader';
import { X, CreditCard, FolderOpen, MapPin, Camera, Video } from 'lucide-react';
import styles from './DemandForm.module.css';

const CATEGORIES = [
    'FASHION', 'GADGETS', 'BEAUTY', 'COSMETICS', 'FOOD',
    'FURNITURE', 'VEHICLES', 'SERVICES', 'TRANSPORT',
    'SPORT', 'HOUSING', 'BOOKS', 'COURSE', 'OTHER'
];
const CURRENCIES = ['₦', '$', '£', '€'];

export interface DemandInitialData {
    id: string;
    text: string;
    category: string;
    categoryOther?: string | null;
    currency: string;
    budget: string;
    budgetMin?: string;
    location?: string;
    images: string[];
    videoUrl?: string;
}

export default function DemandForm({ defaultQuery, initialData }: { defaultQuery: string, initialData?: DemandInitialData }) {
    const router = useRouter();
    const { data: session } = useSession();

    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

    const [formData, setFormData] = useState({
        text: initialData?.text || (defaultQuery ? defaultQuery : ''),
        category: initialData?.category || 'OTHER',
        categoryOther: initialData?.categoryOther || '',
        currency: initialData?.currency || '₦',
        budget: initialData?.budget || '',           // raw max budget for API
        displayBudget: initialData?.budget ? Number(initialData.budget).toLocaleString() : '',    // formatted max for UI
        budgetMin: initialData?.budgetMin || '',        // raw min budget for API
        displayBudgetMin: initialData?.budgetMin ? Number(initialData.budgetMin).toLocaleString() : '', // formatted min for UI
        location: initialData?.location || '',
        images: initialData?.images || ([] as string[]),
        videoUrl: initialData?.videoUrl || '',
    });

    const [activeInput, setActiveInput] = useState<'budget' | 'category' | 'location' | 'media' | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Load draft on mount
    useEffect(() => {
        const draft = localStorage.getItem('demand_draft');
        if (draft && !defaultQuery) {
            try {
                const parsed = JSON.parse(draft);
                setFormData(prev => ({ ...prev, ...parsed }));
            } catch (e) { }
        }
    }, [defaultQuery]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [formData.text]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        if (e.target.name === 'budget' || e.target.name === 'budgetMin') {
            const rawValue = e.target.value.replace(/\D/g, '');
            const formatted = rawValue ? Number(rawValue).toLocaleString() : '';
            if (e.target.name === 'budget') {
                setFormData(prev => ({ ...prev, budget: rawValue, displayBudget: formatted }));
            } else {
                setFormData(prev => ({ ...prev, budgetMin: rawValue, displayBudgetMin: formatted }));
            }
        } else {
            setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
        }
    };

    const handleClose = () => {
        if (formData.text || formData.budget || formData.location || formData.images.length > 0 || formData.videoUrl) {
            const save = confirm("Save as draft?");
            if (save) {
                localStorage.setItem('demand_draft', JSON.stringify(formData));
            } else {
                localStorage.removeItem('demand_draft');
            }
        }
        router.back();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Basic validation before submission to ensure both text and budget are provided
        if (!formData.text.trim()) {
            toast.error('Please enter what you are looking for.');
            return;
        }
        if (!formData.budget || isNaN(parseFloat(formData.budget))) {
            toast.error('Please provide a valid budget.');
            setActiveInput('budget');
            return;
        }

        setStatus('loading');

        try {
            const url = initialData ? `/api/requests/${initialData.id}` : '/api/demands/create';
            const method = initialData ? 'PATCH' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: formData.text,
                    category: formData.category,
                    categoryOther: formData.category === 'OTHER' ? formData.categoryOther || null : null,
                    budget: parseFloat(formData.budget),
                    budgetMin: formData.budgetMin ? parseFloat(formData.budgetMin) : undefined,
                    currency: formData.currency,
                    location: formData.location || undefined,
                    images: formData.images,
                    videoUrl: formData.videoUrl || undefined,
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Failed to post request');
            }

            setStatus('success');
            localStorage.removeItem('demand_draft');
            toast.success(initialData ? 'Request updated' : 'Request posted!');

            if (initialData) {
                router.push(`/requests/${initialData.id}`);
            } else {
                router.push('/requests');
            }
            router.refresh();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            setStatus('error');
            toast.error(err.message || 'An unexpected error occurred.');
        }
    };

    const userAvatar = session?.user?.image || null;
    const userName = session?.user?.name || 'You';
    const canPost = formData.text.trim().length > 0 && formData.budget !== '' && status !== 'loading';

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
                    {initialData ? 'Save Changes' : 'Post'}
                </button>
            </div>


            <div className={styles.body}>
                <div className={styles.authorRow}>
                    <div className={styles.avatar}>
                        {userAvatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={userAvatar} alt="avatar" />
                        ) : (
                            <div className={styles.avatarFallback}>{userName.charAt(0).toUpperCase()}</div>
                        )}
                    </div>
                    <div className={styles.authorInfo}>
                        <span className={styles.authorName}>{userName}</span>
                        <span className={styles.postVisibility}>Everyone can view and bid</span>
                    </div>
                </div>

                <textarea
                    ref={textareaRef}
                    name="text"
                    className={styles.composer}
                    placeholder="What are you looking for? (e.g. iPhone 13 Pro Max 256GB)"
                    value={formData.text}
                    onChange={handleChange}
                    onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleSubmit(e as unknown as React.FormEvent); } }}
                    autoFocus
                />

                <div className={styles.mediaSection}>
                    {formData.images.map((url, idx) => (
                        <div key={idx} className={styles.mediaPreview}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt="Requested Item" />
                            <button
                                type="button"
                                className={styles.removeBtn}
                                onClick={() => setFormData(prev => ({ ...prev, images: prev.images.filter((_: any, i: number) => i !== idx) }))}
                            >
                                ✕
                            </button>
                        </div>
                    ))}

                    {formData.videoUrl && (
                        <div className={styles.mediaPreview}>
                            <video src={formData.videoUrl} muted playsInline onClick={(e) => (e.target as HTMLVideoElement).play()} />
                            <button
                                type="button"
                                className={styles.removeBtn}
                                onClick={() => setFormData({ ...formData, videoUrl: '' })}
                            >
                                ✕
                            </button>
                        </div>
                    )}

                    {formData.images.length < 4 && (
                        <CloudinaryUploader
                            onUploadSuccess={(res: CloudinaryUploadResult) => setFormData(prev => ({ ...prev, images: [...prev.images, res.secure_url] }))}
                            accept="image/*"
                            maxSizeMB={10}
                            buttonText="Add Photo"
                        />
                    )}

                    {!formData.videoUrl && (
                        <CloudinaryUploader
                            onUploadSuccess={(res: CloudinaryUploadResult) => setFormData({ ...formData, videoUrl: res.secure_url })}
                            accept="video/*"
                            maxSizeMB={100}
                            maxDurationSeconds={60}
                            buttonText="Add Video"
                        />
                    )}
                </div>
            </div>

            {/* Inline expandable inputs based on active pill */}
            {activeInput === 'budget' && (
                <div className={styles.inlineInputRow} style={{ flexWrap: 'wrap', gap: '8px' }}>
                    <select
                        name="currency"
                        value={formData.currency}
                        onChange={handleChange}
                        className={styles.currencySelect}
                    >
                        {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input
                        type="text"
                        name="budgetMin"
                        inputMode="numeric"
                        placeholder="Min (optional)"
                        value={formData.displayBudgetMin}
                        onChange={handleChange}
                        className={styles.inlineInput}
                        style={{ flex: '1 1 100px' }}
                        autoFocus
                    />
                    <span style={{ alignSelf: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>–</span>
                    <input
                        type="text"
                        name="budget"
                        inputMode="numeric"
                        placeholder="Max budget"
                        value={formData.displayBudget}
                        onChange={handleChange}
                        className={styles.inlineInput}
                        style={{ flex: '1 1 100px' }}
                    />
                    <button type="button" className={styles.doneBtn} onClick={() => setActiveInput(null)}>Done</button>
                </div>
            )}

            {activeInput === 'category' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    <div className={styles.inlineInputRow}>
                        <select
                            name="category"
                            value={formData.category}
                            onChange={handleChange}
                            className={styles.categorySelect}
                            autoFocus
                        >
                            {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>)}
                        </select>
                        <button type="button" className={styles.doneBtn} onClick={() => setActiveInput(null)}>Done</button>
                    </div>
                    {formData.category === 'OTHER' && (
                        <div className={styles.inlineInputRow} style={{ borderTop: '1px solid var(--border)' }}>
                            <input
                                type="text"
                                name="categoryOther"
                                placeholder="Specify category (e.g. Perfume, Pet supplies…)"
                                value={formData.categoryOther}
                                onChange={handleChange}
                                className={styles.inlineInput}
                                maxLength={40}
                            />
                        </div>
                    )}
                </div>
            )}

            {activeInput === 'location' && (
                <div className={styles.inlineInputRow}>
                    <input
                        type="text"
                        name="location"
                        placeholder="E.g., Lagos / Nationwide"
                        value={formData.location}
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
                        className={`${styles.pill} ${formData.budget ? styles.pillActive : ''}`}
                        onClick={() => setActiveInput(activeInput === 'budget' ? null : 'budget')}
                    >
                        <CreditCard size={16} className={styles.pillIcon} />
                        {formData.budget
                            ? formData.budgetMin
                                ? `${formData.currency}${formData.displayBudgetMin} – ${formData.currency}${formData.displayBudget}`
                                : `${formData.currency}${formData.displayBudget}`
                            : 'Budget'}
                    </button>

                    <button
                        type="button"
                        className={`${styles.pill} ${formData.category !== 'OTHER' ? styles.pillActive : ''}`}
                        onClick={() => setActiveInput(activeInput === 'category' ? null : 'category')}
                    >
                        <FolderOpen size={16} className={styles.pillIcon} />
                        {formData.category === 'OTHER' ? 'Category' : formData.category}
                    </button>

                    <button
                        type="button"
                        className={`${styles.pill} ${formData.location ? styles.pillActive : ''}`}
                        onClick={() => setActiveInput(activeInput === 'location' ? null : 'location')}
                    >
                        <MapPin size={16} className={styles.pillIcon} />
                        {formData.location ? formData.location : 'Location'}
                    </button>
                </div>
            </div>
        </div>
    );
}
