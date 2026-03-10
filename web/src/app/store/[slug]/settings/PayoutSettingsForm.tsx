'use client';

import React, { useState, useEffect, useRef } from 'react';
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

    // Bank search combobox state
    const [bankSearch, setBankSearch] = useState('');
    const [showBankList, setShowBankList] = useState(false);
    const bankSearchRef = useRef<HTMLDivElement>(null);

    const [loading, setLoading] = useState(true);
    const [resolving, setResolving] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showOtpModal, setShowOtpModal] = useState(false);
    const [otpCode, setOtpCode] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [msg, setMsg] = useState({ text: '', type: '' });

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (bankSearchRef.current && !bankSearchRef.current.contains(e.target as Node)) {
                setShowBankList(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch(`/api/store/${slug}/payout`);
                if (res.ok) {
                    const data = await res.json();
                    const bankList: Bank[] = data.banks || [];
                    setBanks(bankList);
                    setFormData({
                        bankCode: data.bankCode || '',
                        bankAccountNo: data.bankAccountNo || '',
                        bankAccountName: data.bankAccountName || ''
                    });
                    // Populate search input with saved bank name
                    if (data.bankCode) {
                        const saved = bankList.find((b: Bank) => b.code === data.bankCode);
                        if (saved) setBankSearch(saved.name);
                    }
                }
            } catch {
                console.error('Failed to load payout settings');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [slug]);

    const filteredBanks = banks
        .filter(b => b.name.toLowerCase().includes(bankSearch.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name));

    const handleBankSelect = (bank: Bank) => {
        setBankSearch(bank.name);
        setShowBankList(false);
        setFormData(prev => ({ ...prev, bankCode: bank.code, bankAccountName: '' }));
    };

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
            } catch {
                setMsg({ text: 'Error verifying account', type: 'error' });
            } finally {
                setResolving(false);
            }
        } else {
            setFormData(prev => ({ ...prev, bankAccountName: '' }));
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
        if (e.target.name === 'bankAccountNo') {
            setFormData(prev => ({ ...prev, bankAccountName: '' }));
        }
    };

    // Auto-resolve when bank code changes and account number is 10 digits
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
        } catch {
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

            {/* — Searchable bank picker — */}
            <div className={styles.formGroup}>
                <label className={styles.label}>Bank Name</label>
                <div ref={bankSearchRef} style={{ position: 'relative' }}>
                    <input
                        type="text"
                        className={styles.input}
                        placeholder="Search bank..."
                        value={bankSearch}
                        autoComplete="off"
                        onChange={(e) => {
                            setBankSearch(e.target.value);
                            setShowBankList(true);
                            // Clear selection if user edits
                            setFormData(prev => ({ ...prev, bankCode: '', bankAccountName: '' }));
                        }}
                        onFocus={() => setShowBankList(true)}
                    />
                    {/* Search icon */}
                    <svg
                        style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}
                        width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    >
                        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                    </svg>

                    {showBankList && bankSearch.length > 0 && (
                        <div style={{
                            position: 'absolute',
                            top: 'calc(100% + 4px)',
                            left: 0,
                            right: 0,
                            background: 'var(--card-bg)',
                            border: '1px solid var(--card-border)',
                            borderRadius: '12px',
                            maxHeight: '220px',
                            overflowY: 'auto',
                            zIndex: 50,
                            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                        }}>
                            {filteredBanks.length === 0 ? (
                                <div style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                    No banks found
                                </div>
                            ) : (
                                filteredBanks.map(bank => (
                                    <button
                                        key={bank.code}
                                        type="button"
                                        onMouseDown={(e) => { e.preventDefault(); handleBankSelect(bank); }}
                                        style={{
                                            display: 'block',
                                            width: '100%',
                                            textAlign: 'left',
                                            padding: '11px 16px',
                                            background: formData.bankCode === bank.code ? 'rgba(0,200,83,0.08)' : 'transparent',
                                            border: 'none',
                                            color: formData.bankCode === bank.code ? 'var(--primary)' : 'var(--text-main)',
                                            fontWeight: formData.bankCode === bank.code ? 600 : 400,
                                            fontSize: '0.9rem',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        {bank.name}
                                    </button>
                                ))
                            )}
                        </div>
                    )}
                </div>
                {formData.bankCode && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--primary)', margin: '4px 0 0', fontWeight: 600 }}>
                        ✓ {bankSearch}
                    </p>
                )}
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

            <button type="submit" className={styles.submitBtn} disabled={saving || resolving || !formData.bankAccountName || !formData.bankCode}>
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
