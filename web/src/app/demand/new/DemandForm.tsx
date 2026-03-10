'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import CloudinaryUploader, { CloudinaryUploadResult } from '@/components/CloudinaryUploader';
import { X, CreditCard, FolderOpen, MapPin, Camera, Video } from 'lucide-react';
import styles from './DemandForm.module.css';

const CATEGORIES = [
    'FASHION', 'GADGETS', 'BEAUTY', 'FOOD', 'FURNITURE', 'VEHICLES', 'SERVICES', 'OTHER'
];
const CURRENCIES = ['₦', '$', '£', '€'];

export default function DemandForm({ defaultQuery }: { defaultQuery: string }) {
    const router = useRouter();
    const { data: session } = useSession();

    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');

    const [formData, setFormData] = useState({
        text: defaultQuery ? defaultQuery : '',
        category: 'OTHER',
        currency: '₦',
        budget: '', // Raw unformatted number string for API
        displayBudget: '', // Formatted string with commas for UI
        location: '',
        images: [] as string[],
        videoUrl: '',
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
        if (e.target.name === 'budget') {
            // Remove any non-numeric characters for the raw value
            const rawValue = e.target.value.replace(/\D/g, '');
            // Format with commas for display
            const formattedValue = rawValue ? Number(rawValue).toLocaleString() : '';

            setFormData(prev => ({
                ...prev,
                budget: rawValue,
                displayBudget: formattedValue
            }));
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
            setErrorMsg('Please enter what you are looking for.');
            return;
        }
        if (!formData.budget || isNaN(parseFloat(formData.budget))) {
            setErrorMsg('Please provide a valid budget.');
            setActiveInput('budget');
            return;
        }

        setStatus('loading');
        setErrorMsg('');

        try {
            const res = await fetch('/api/demands/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: formData.text,
                    category: formData.category,
                    budget: parseFloat(formData.budget),
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

            // Redirect to Requests feed
            router.push('/requests');
            router.refresh();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            setStatus('error');
            setErrorMsg(err.message || 'An unexpected error occurred.');
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
                    Post
                </button>
            </div>

            {status === 'error' && (
                <div className={styles.errorBanner}>{errorMsg}</div>
            )}

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
                <div className={styles.inlineInputRow}>
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
                        name="budget"
                        inputMode="numeric"
                        placeholder="Budget amount"
                        value={formData.displayBudget}
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
                        value={formData.category}
                        onChange={handleChange}
                        className={styles.categorySelect}
                        autoFocus
                    >
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <button type="button" className={styles.doneBtn} onClick={() => setActiveInput(null)}>Done</button>
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
                        {formData.budget ? `${formData.currency}${formData.displayBudget}` : 'Budget'}
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
