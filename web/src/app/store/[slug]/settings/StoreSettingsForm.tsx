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
    storeState: string | null;
    localDeliveryFee: number | null;
    nationwideDeliveryFee: number | null;
}

export default function StoreSettingsForm({ store }: { store: StoreData }) {
    const router = useRouter();
    const [formData, setFormData] = useState({
        description: store.description || '',
        location: store.location || '',
        bannerUrl: store.bannerUrl || '',
        logoUrl: store.logoUrl || '',
        storeState: store.storeState || '',
        localDeliveryFee: store.localDeliveryFee != null ? String(store.localDeliveryFee) : '',
        nationwideDeliveryFee: store.nationwideDeliveryFee != null ? String(store.nationwideDeliveryFee) : '',
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

        const payload: Record<string, unknown> = {
            description: formData.description || null,
            location: formData.location || null,
            bannerUrl: formData.bannerUrl || null,
            logoUrl: formData.logoUrl || null,
            storeState: formData.storeState || null,
            localDeliveryFee: formData.localDeliveryFee !== '' ? Number(formData.localDeliveryFee) : null,
            nationwideDeliveryFee: formData.nationwideDeliveryFee !== '' ? Number(formData.nationwideDeliveryFee) : null,
        };

        try {
            const res = await fetch(`/api/store/${store.slug}/settings`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                setMsg({ text: 'Store settings saved successfully!', type: 'success' });
                router.refresh();
            } else {
                const data = await res.json().catch(() => ({}));
                setMsg({ text: data.message || 'Failed to update store', type: 'error' });
            }
        } catch {
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

            {/* ── Delivery Fees ──────────────────────────────── */}
            <div className={styles.sectionDivider}>
                <span>Delivery Fees</span>
            </div>

            <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="storeState">Your State</label>
                <input
                    type="text"
                    id="storeState"
                    name="storeState"
                    className={styles.input}
                    placeholder="e.g. Lagos"
                    value={formData.storeState}
                    onChange={handleChange}
                    maxLength={100}
                />
                <span className={styles.helpText}>Used to determine local vs nationwide delivery at checkout.</span>
            </div>

            <div className={styles.feeRow}>
                <div className={styles.formGroup} style={{ flex: 1, minWidth: 0 }}>
                    <label className={styles.label} htmlFor="localDeliveryFee">Local Fee (₦)</label>
                    <input
                        type="number"
                        id="localDeliveryFee"
                        name="localDeliveryFee"
                        className={styles.input}
                        placeholder="e.g. 1500"
                        value={formData.localDeliveryFee}
                        onChange={handleChange}
                        min={0}
                        step={100}
                    />
                    <span className={styles.helpText}>Same state as your store</span>
                </div>
                <div className={styles.formGroup} style={{ flex: 1, minWidth: 0 }}>
                    <label className={styles.label} htmlFor="nationwideDeliveryFee">Nationwide Fee (₦)</label>
                    <input
                        type="number"
                        id="nationwideDeliveryFee"
                        name="nationwideDeliveryFee"
                        className={styles.input}
                        placeholder="e.g. 3500"
                        value={formData.nationwideDeliveryFee}
                        onChange={handleChange}
                        min={0}
                        step={100}
                    />
                    <span className={styles.helpText}>Different state (interstate)</span>
                </div>
            </div>
            <span className={styles.helpText} style={{ display: 'block', marginTop: '-4px' }}>
                Per-product delivery fees override these defaults. Set to 0 for free delivery.
            </span>

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
