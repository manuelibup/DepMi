'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import CloudinaryUploader, { CloudinaryUploadResult } from '@/components/CloudinaryUploader';
import styles from './RequestDetail.module.css';

interface ProductMin {
    id: string;
    title: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    price: any;
}

export default function BidForm({ 
    demandId, 
    storeId, 
    products 
}: { 
    demandId: string; 
    storeId: string; 
    products: ProductMin[];
}) {
    const router = useRouter();
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');

    const [formData, setFormData] = useState({
        amount: '',
        proposal: '',
        productId: '',
        images: [] as string[],
        videoUrl: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleProductSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        const selectedPrd = products.find(p => p.id === val);
        
        setFormData(prev => ({ 
            ...prev, 
            productId: val,
            // Auto-fill the amount with the product's price if available and amount is empty
            amount: (selectedPrd && !prev.amount) ? String(selectedPrd.price) : prev.amount
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');
        setErrorMsg('');

        try {
            const res = await fetch('/api/bids/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    demandId,
                    storeId,
                    amount: parseFloat(formData.amount),
                    proposal: formData.proposal || undefined,
                    productId: formData.productId || undefined,
                    images: formData.images.length > 0 ? formData.images : undefined,
                    videoUrl: formData.videoUrl || undefined,
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Failed to submit bid');
            }

            setStatus('success');
            setFormData({ amount: '', proposal: '', productId: '', images: [], videoUrl: '' });
            router.refresh();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            setStatus('error');
            setErrorMsg(err.message || 'An unexpected error occurred.');
        }
    };

    if (status === 'success') {
        return (
            <div className={styles.successState}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
                <p>Bid submitted successfully!</p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className={styles.bidForm}>
            <div className={styles.formRow}>
                <div className={styles.inputGroup}>
                    <label htmlFor="amount">Your Price (₦)</label>
                    <input 
                        type="number" 
                        id="amount" 
                        name="amount" 
                        required min="100" 
                        value={formData.amount}
                        onChange={handleChange}
                        className={styles.input}
                        placeholder="e.g. 45000"
                    />
                </div>
            </div>

            <div className={styles.inputGroup}>
                <label htmlFor="productId">Attach Product (Optional)</label>
                <select 
                    id="productId" 
                    name="productId" 
                    value={formData.productId} 
                    onChange={handleProductSelect}
                    className={styles.select}
                >
                    <option value="">-- No product attached --</option>
                    {products.map(p => (
                        <option key={p.id} value={p.id}>{p.title} (₦{Number(p.price)})</option>
                    ))}
                </select>
                <p className={styles.helpText}>Select an item from your store to link to this bid.</p>
            </div>

            <div className={styles.inputGroup}>
                <label htmlFor="proposal">Message / Proposal (Optional)</label>
                <textarea
                    id="proposal"
                    name="proposal"
                    value={formData.proposal}
                    onChange={handleChange}
                    onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleSubmit(e as unknown as React.FormEvent); } }}
                    className={styles.textarea}
                    placeholder="I have exactly what you need in pristine condition... (Ctrl+Enter to submit)"
                    rows={2}
                />
            </div>

            <div className={styles.inputGroup}>
                <label>Media Upload (Max 4 photos, 1 video)</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    {formData.images.map((url, idx) => (
                        <div key={idx} style={{ position: 'relative', width: 60, height: 60 }}>
                            <img src={url} alt="upload" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
                            <button type="button" onClick={() => setFormData(p => ({ ...p, images: p.images.filter((_, i) => i !== idx) }))} style={{ position: 'absolute', top: -5, right: -5, background: 'red', color: 'white', borderRadius: '50%', width: 20, height: 20, border: 'none', cursor: 'pointer', fontSize: 12 }}>✕</button>
                        </div>
                    ))}
                    {formData.videoUrl && (
                        <div style={{ position: 'relative', width: 60, height: 60 }}>
                            <video src={formData.videoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} muted />
                            <button type="button" onClick={() => setFormData(p => ({ ...p, videoUrl: '' }))} style={{ position: 'absolute', top: -5, right: -5, background: 'red', color: 'white', borderRadius: '50%', width: 20, height: 20, border: 'none', cursor: 'pointer', fontSize: 12 }}>✕</button>
                        </div>
                    )}
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    {(formData.images.length + (formData.videoUrl ? 1 : 0)) < 4 && (
                        <CloudinaryUploader
                            onUploadSuccess={(res: CloudinaryUploadResult) => setFormData(p => ({ ...p, images: [...p.images, res.secure_url] }))}
                            accept="image/*"
                            maxSizeMB={10}
                            buttonText="Add Photo"
                        />
                    )}
                    {(formData.images.length + (formData.videoUrl ? 1 : 0)) < 4 && !formData.videoUrl && (
                        <CloudinaryUploader
                            onUploadSuccess={(res: CloudinaryUploadResult) => setFormData(p => ({ ...p, videoUrl: res.secure_url }))}
                            accept="video/*"
                            maxSizeMB={100}
                            maxDurationSeconds={60}
                            buttonText="Add Video"
                        />
                    )}
                </div>
            </div>

            {status === 'error' && <p className={styles.errorText}>{errorMsg}</p>}

            <button type="submit" disabled={status === 'loading'} className={styles.submitBtn}>
                {status === 'loading' ? 'Submitting...' : 'Place Bid'}
            </button>
        </form>
    );
}
