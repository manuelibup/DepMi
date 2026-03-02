'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './DemandForm.module.css';

const CATEGORIES = [
    'FASHION', 'GADGETS', 'BEAUTY', 'FOOD', 'FURNITURE', 'VEHICLES', 'SERVICES', 'OTHER'
];

export default function DemandForm({ defaultQuery }: { defaultQuery: string }) {
    const router = useRouter();
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');

    const [formData, setFormData] = useState({
        text: defaultQuery ? `I am looking for: ${defaultQuery}` : '',
        category: 'OTHER',
        budget: '',
        location: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
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
                    location: formData.location || undefined,
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Failed to post request');
            }

            setStatus('success');
            // Redirect to Requests feed
            router.push('/requests');
            router.refresh();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            setStatus('error');
            setErrorMsg(err.message || 'An unexpected error occurred.');
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.headerArea}>
                <button type="button" onClick={() => router.back()} className={styles.backBtn} aria-label="Go back">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m15 18-6-6 6-6"/>
                    </svg>
                </button>
                <h1 className={styles.title}>Post a Request</h1>
                <div style={{ width: 24 }} /> {/* Spacer */}
            </div>

            <p className={styles.subtitle}>
                Tell sellers exactly what you&apos;re looking for and let them come to you with offers.
            </p>

            <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.inputGroup}>
                    <label className={styles.label} htmlFor="text">What do you need?</label>
                    <textarea 
                        id="text"
                        name="text"
                        required
                        className={styles.textarea}
                        placeholder="E.g., I'm looking for a fairly used iPhone 13 Pro 256GB"
                        value={formData.text}
                        onChange={handleChange}
                        rows={4}
                    />
                </div>

                <div className={styles.inputGroup}>
                    <label className={styles.label} htmlFor="category">Category</label>
                    <div className={styles.selectWrapper}>
                        <select 
                            id="category"
                            name="category"
                            className={styles.select}
                            value={formData.category}
                            onChange={handleChange}
                        >
                            {CATEGORIES.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                        <div className={styles.selectArrow}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
                        </div>
                    </div>
                </div>

                <div className={styles.inputGroup}>
                    <label className={styles.label} htmlFor="budget">Your Budget (₦)</label>
                    <div className={styles.currencyWrapper}>
                        <span className={styles.currencySymbol}>₦</span>
                        <input 
                            type="number" 
                            id="budget"
                            name="budget"
                            required
                            min="100"
                            className={`${styles.input} ${styles.inputWithIcon}`}
                            placeholder="50000"
                            value={formData.budget}
                            onChange={handleChange}
                        />
                    </div>
                </div>

                <div className={styles.inputGroup}>
                    <label className={styles.label} htmlFor="location">Location (Optional)</label>
                    <div className={styles.locationWrapper}>
                        <svg className={styles.inputIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                        <input 
                            type="text" 
                            id="location"
                            name="location"
                            className={`${styles.input} ${styles.inputWithIcon}`}
                            placeholder="E.g., Lagos / Nationwide"
                            value={formData.location}
                            onChange={handleChange}
                        />
                    </div>
                </div>

                {status === 'error' && (
                    <div className={styles.errorBanner}>{errorMsg}</div>
                )}

                <button 
                    type="submit" 
                    className={styles.submitBtn}
                    disabled={status === 'loading'}
                >
                    {status === 'loading' ? 'Posting...' : 'Post Request'}
                </button>
            </form>
        </div>
    );
}
