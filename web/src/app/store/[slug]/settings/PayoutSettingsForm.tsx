'use client';

import React, { useState, useEffect } from 'react';
import styles from './page.module.css';
import { useRouter } from 'next/navigation';

interface Bank {
    code: string;
    name: string;
}

interface Props {
    slug: string;
}

export default function PayoutSettingsForm({ slug }: Props) {
    const router = useRouter();
    const [banks, setBanks] = useState<Bank[]>([]);
    const [formData, setFormData] = useState({
        bankCode: '',
        bankAccountNo: '',
        bankAccountName: ''
    });
    
    const [loading, setLoading] = useState(true);
    const [resolving, setResolving] = useState(false);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState({ text: '', type: '' });

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch(`/api/store/${slug}/payout`);
                if (res.ok) {
                    const data = await res.json();
                    setBanks(data.banks || []);
                    setFormData({
                        bankCode: data.bankCode || '',
                        bankAccountNo: data.bankAccountNo || '',
                        bankAccountName: data.bankAccountName || ''
                    });
                }
            } catch (err) {
                console.error('Failed to load payout settings');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [slug]);

    const handleAccountBlur = async () => {
        if (formData.bankAccountNo.length === 10 && formData.bankCode) {
            setResolving(true);
            setMsg({ text: '', type: '' });
            try {
                const res = await fetch(`/api/banks/resolve?accountNumber=${formData.bankAccountNo}&bankCode=${formData.bankCode}`);
                if (res.ok) {
                    const data = await res.json();
                    setFormData(prev => ({ ...prev, bankAccountName: data.accountName }));
                } else {
                    setFormData(prev => ({ ...prev, bankAccountName: '' }));
                    setMsg({ text: 'Could not verify account number', type: 'error' });
                }
            } catch (err) {
                setMsg({ text: 'Error verifying account', type: 'error' });
            } finally {
                setResolving(false);
            }
        } else {
            setFormData(prev => ({ ...prev, bankAccountName: '' }));
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
        if (e.target.name === 'bankAccountNo') {
            setFormData(prev => ({ ...prev, bankAccountName: '' }));
        }
    };

    const handleBankChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, bankCode: e.target.value, bankAccountName: '' }));
    };
    
    // Attempt resolution when bank code changes and account number is 10 digits
    useEffect(() => {
        if (formData.bankAccountNo.length === 10 && formData.bankCode && !formData.bankAccountName && !resolving) {
            handleAccountBlur();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData.bankCode]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMsg({ text: '', type: '' });

        try {
            const res = await fetch(`/api/store/${slug}/payout`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                setMsg({ text: 'Payout settings saved successfully!', type: 'success' });
                router.refresh();
            } else {
                const data = await res.json().catch(() => ({}));
                setMsg({ text: data.message || 'Failed to update payout settings', type: 'error' });
            }
        } catch (error) {
            setMsg({ text: 'An unexpected error occurred', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className={styles.formCard} style={{ marginTop: '24px' }}>Loading payout settings...</div>;

    return (
        <form className={styles.formCard} onSubmit={handleSubmit} style={{ marginTop: '24px' }}>
            <div>
                <h2 className={styles.title} style={{ marginBottom: '8px' }}>Payout Account</h2>
                <p className={styles.helpText}>Provide the bank account where you want to receive your earnings.</p>
            </div>

            <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="bankCode">Bank Name</label>
                <select
                    id="bankCode"
                    name="bankCode"
                    className={styles.input}
                    value={formData.bankCode}
                    onChange={handleBankChange}
                    required
                >
                    <option value="">Select a bank</option>
                    {banks.map(b => (
                        <option key={b.code} value={b.code}>{b.name}</option>
                    ))}
                </select>
            </div>

            <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="bankAccountNo">Account Number</label>
                <input
                    type="text"
                    id="bankAccountNo"
                    name="bankAccountNo"
                    className={styles.input}
                    placeholder="10-digit account number"
                    value={formData.bankAccountNo}
                    onChange={handleChange}
                    onBlur={handleAccountBlur}
                    maxLength={10}
                    required
                />
            </div>

            <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="bankAccountName">Account Name</label>
                <input
                    type="text"
                    id="bankAccountName"
                    name="bankAccountName"
                    className={styles.input}
                    value={resolving ? 'Verifying account...' : formData.bankAccountName}
                    placeholder="Auto-resolves after entering number"
                    readOnly
                    required
                    style={{ backgroundColor: 'var(--bg-hover)', color: resolving ? 'var(--text-muted)' : 'var(--text-main)' }}
                />
            </div>

            <button type="submit" className={styles.submitBtn} disabled={saving || resolving || !formData.bankAccountName}>
                {saving ? 'Saving...' : 'Save Payout Settings'}
            </button>

            {msg.text && (
                <p className={`${styles.message} ${msg.type === 'success' ? styles.success : styles.error}`}>
                    {msg.text}
                </p>
            )}
        </form>
    );
}
