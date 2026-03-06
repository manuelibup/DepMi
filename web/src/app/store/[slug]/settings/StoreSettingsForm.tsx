'use client';

import React, { useState } from 'react';
import styles from './page.module.css';
import CloudinaryUploader from '@/components/CloudinaryUploader';
import { useRouter } from 'next/navigation';

interface StoreData {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    bannerUrl: string | null;
    logoUrl: string | null;
    location: string | null;
}

export default function StoreSettingsForm({ store }: { store: StoreData }) {
    const router = useRouter();
    const [formData, setFormData] = useState({
        description: store.description || '',
        location: store.location || '',
        bannerUrl: store.bannerUrl || '',
        logoUrl: store.logoUrl || '',
    });

    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState({ text: '', type: '' });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMsg({ text: '', type: '' });

        try {
            const res = await fetch(`/api/store/${store.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                setMsg({ text: 'Store settings saved successfully!', type: 'success' });
                router.refresh(); // Tells Next.js to re-fetch Server Components for current route
            } else {
                const data = await res.json().catch(() => ({}));
                setMsg({ text: data.message || 'Failed to update store', type: 'error' });
            }
        } catch (error) {
            setMsg({ text: 'An unexpected error occurred', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <form className={styles.formCard} onSubmit={handleSubmit}>
            <div className={styles.mediaSection}>
                <div className={styles.mediaRow}>
                    <label className={styles.label}>Store Banner</label>
                    {formData.bannerUrl && (
                        <img src={formData.bannerUrl} alt="Store Banner" className={styles.previewImage} />
                    )}
                    <CloudinaryUploader 
                        onUploadSuccess={(res) => setFormData(p => ({ ...p, bannerUrl: res.secure_url }))}
                        buttonText={formData.bannerUrl ? 'Change Banner' : 'Upload Banner'}
                    />
                </div>

                <div className={styles.mediaRow}>
                    <label className={styles.label}>Store Logo</label>
                    {formData.logoUrl && (
                        <img src={formData.logoUrl} alt="Store Logo" className={styles.logoPreview} />
                    )}
                    <CloudinaryUploader 
                        onUploadSuccess={(res) => setFormData(p => ({ ...p, logoUrl: res.secure_url }))}
                        buttonText={formData.logoUrl ? 'Change Logo' : 'Upload Logo'}
                    />
                </div>
            </div>

            <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="description">Store Description</label>
                <textarea
                    id="description"
                    name="description"
                    className={styles.textarea}
                    placeholder="Tell customers what your store is about..."
                    value={formData.description}
                    onChange={handleChange}
                    maxLength={500}
                />
                <span className={styles.helpText}>{formData.description.length}/500</span>
            </div>

            <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="location">Primary Business Location</label>
                <input
                    type="text"
                    id="location"
                    name="location"
                    className={styles.input}
                    placeholder="e.g. Lagos, Nigeria"
                    value={formData.location}
                    onChange={handleChange}
                    maxLength={100}
                />
            </div>

            <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
            </button>

            {msg.text && (
                <p className={`${styles.message} ${msg.type === 'success' ? styles.success : styles.error}`}>
                    {msg.text}
                </p>
            )}
        </form>
    );
}
