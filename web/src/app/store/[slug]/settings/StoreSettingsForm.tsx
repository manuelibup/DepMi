'use client';

import React, { useState } from 'react';
import styles from './page.module.css';
import { toast } from 'sonner';
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
    dispatchEnabled: boolean;
    pickupAddress: string | null;
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
        dispatchEnabled: store.dispatchEnabled,
        pickupAddress: store.pickupAddress || '',
    });

    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const payload: Record<string, unknown> = {
            description: formData.description || null,
            location: formData.location || null,
            bannerUrl: formData.bannerUrl || null,
            logoUrl: formData.logoUrl || null,
            storeState: formData.storeState || null,
            localDeliveryFee: formData.localDeliveryFee !== '' ? Number(formData.localDeliveryFee) : null,
            nationwideDeliveryFee: formData.nationwideDeliveryFee !== '' ? Number(formData.nationwideDeliveryFee) : null,
            dispatchEnabled: formData.dispatchEnabled,
            pickupAddress: formData.pickupAddress || null,
        };

        try {
            const res = await fetch(`/api/store/${store.slug}/settings`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                toast.success('Store settings saved');
                router.refresh();
            } else {
                const data = await res.json().catch(() => ({}));
                toast.error(data.message || 'Failed to update store');
            }
        } catch {
            toast.error('An unexpected error occurred');
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

            {/* ── DepMi Dispatch ─────────────────────────────── */}
            <div className={styles.sectionDivider}>
                <span>DepMi Dispatch</span>
            </div>

            <div className={styles.formGroup}>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                    <div>
                        <span className={styles.label} style={{ marginBottom: 0 }}>Enable DepMi Dispatch</span>
                        <span className={styles.helpText} style={{ display: 'block', marginTop: '2px' }}>
                            GIG Logistics riders pick up from your store and deliver to buyers automatically.
                        </span>
                    </div>
                    <input
                        type="checkbox"
                        checked={formData.dispatchEnabled}
                        onChange={(e) => setFormData(p => ({ ...p, dispatchEnabled: e.target.checked }))}
                        style={{ accentColor: 'var(--primary)', width: '18px', height: '18px', flexShrink: 0 }}
                    />
                </label>
            </div>

            {formData.dispatchEnabled && (
                <>
                    {(!formData.pickupAddress || !formData.storeState) && (
                        <div style={{
                            padding: '10px 14px',
                            borderRadius: '10px',
                            background: 'rgba(234,179,8,0.08)',
                            border: '1px solid rgba(234,179,8,0.25)',
                            fontSize: '0.85rem',
                            color: '#ca8a04',
                            lineHeight: 1.5,
                        }}>
                            <strong>Action needed:</strong>{' '}
                            {!formData.storeState && !formData.pickupAddress
                                ? 'Set your State (above) and Pickup Address below to activate live delivery pricing for buyers.'
                                : !formData.storeState
                                ? 'Set your State (above) so buyers get accurate delivery quotes.'
                                : 'Add a Pickup Address below so riders know where to collect orders.'}
                        </div>
                    )}
                    <div className={styles.formGroup}>
                        <label className={styles.label} htmlFor="pickupAddress">Pickup Address</label>
                        <input
                            type="text"
                            id="pickupAddress"
                            name="pickupAddress"
                            className={styles.input}
                            placeholder="e.g. 12 Abak Road, Uyo, Akwa Ibom"
                            value={formData.pickupAddress}
                            onChange={handleChange}
                            maxLength={300}
                        />
                        <span className={styles.helpText}>
                            Format: <strong>Street, City, State</strong> — e.g. <em>12 Abak Road, Uyo, Akwa Ibom</em>
                        </span>
                        {/* Suggest a template if they have location/state but no complete pickup address */}
                        {(() => {
                            const hasPickup = formData.pickupAddress.includes(',');
                            const city = (formData.location || '').split(',')[0].trim();
                            const state = formData.storeState;
                            const suggestion = city && state ? `Your Street, ${city}, ${state}` : state ? `Your Street, ${state}` : null;
                            if (hasPickup || !suggestion) return null;
                            return (
                                <button
                                    type="button"
                                    onClick={() => setFormData(p => ({ ...p, pickupAddress: suggestion }))}
                                    style={{
                                        marginTop: 6,
                                        background: 'rgba(var(--primary-rgb),0.08)',
                                        border: '1px solid rgba(var(--primary-rgb),0.3)',
                                        borderRadius: 8,
                                        color: 'var(--primary)',
                                        fontSize: '0.8rem',
                                        padding: '5px 10px',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                    }}
                                >
                                    Use suggestion: <strong>{suggestion}</strong> — tap to fill, then add your street name
                                </button>
                            );
                        })()}
                    </div>
                </>
            )}

            <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
            </button>

        </form>
    );
}
