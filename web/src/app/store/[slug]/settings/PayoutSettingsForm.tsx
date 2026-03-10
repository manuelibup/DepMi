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
    const [showOtpModal, setShowOtpModal] = useState(false);
    const [otpCode, setOtpCode] = useState('');
    const [otpSent, setOtpSent] = useState(false);
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
                    const data = await res.json().catch(() => ({}));
                    setFormData(prev => ({ ...prev, bankAccountName: '' }));
                    setMsg({ text: data.message || 'Could not verify account number', type: 'error' });
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

    const triggerOtp = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/otp/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'ACCOUNT_UPDATE' })
            });
            if (res.ok) {
                setOtpSent(true);
            } else {
                const data = await res.json();
                setMsg({ text: data.error || 'Failed to send verification code', type: 'error' });
                setShowOtpModal(false);
            }
        } finally {
            setSaving(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setMsg({ text: '', type: '' });
        setShowOtpModal(true);
        setOtpCode('');
        setOtpSent(false);
        triggerOtp();
    };

    const confirmAndSave = async () => {
        setSaving(true);
        try {
            const res = await fetch(`/api/store/${slug}/payout`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, code: otpCode })
            });

            if (res.ok) {
                setMsg({ text: 'Payout settings saved successfully!', type: 'success' });
                setShowOtpModal(false);
                router.refresh();
            } else {
                const data = await res.json().catch(() => ({}));
                setMsg({ text: data.message || 'Verification failed. Please check the code.', type: 'error' });
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

            {showOtpModal && (
                <div className={styles.modalOverlay} onClick={() => !saving && setShowOtpModal(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <h3 className={styles.title} style={{ textAlign: 'center' }}>Verify Identity</h3>
                        <p className={styles.helpText} style={{ textAlign: 'center', marginBottom: '20px' }}>
                            We've sent a code to your phone/email. Enter it to confirm these changes.
                        </p>

                        <input
                            type="text"
                            maxLength={6}
                            className={styles.input}
                            style={{ textAlign: 'center', fontSize: '2rem', letterSpacing: '8px', fontWeight: 800, marginBottom: '20px' }}
                            placeholder="000000"
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        />

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <button
                                type="button"
                                className={styles.submitBtn}
                                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--card-border)', color: 'var(--text-main)' }}
                                onClick={() => setShowOtpModal(false)}
                                disabled={saving}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className={styles.submitBtn}
                                onClick={confirmAndSave}
                                disabled={saving || otpCode.length < 6}
                            >
                                {saving ? 'Verifying...' : 'Confirm'}
                            </button>
                        </div>

                        {!saving && otpSent && (
                            <button
                                type="button"
                                onClick={triggerOtp}
                                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.8rem', marginTop: '16px', cursor: 'pointer', fontWeight: 600, width: '100%' }}
                            >
                                Didn't receive code? Resend
                            </button>
                        )}
                    </div>
                </div>
            )}
        </form>
    );
}
