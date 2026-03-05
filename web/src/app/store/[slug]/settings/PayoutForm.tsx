'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface BankInfo {
    name: string;
    code: string;
}

interface Props {
    slug: string;
    initial: {
        bankCode: string;
        bankAccountNo: string;
        bankAccountName: string;
    };
}

const inputStyle: React.CSSProperties = {
    padding: '12px 16px',
    borderRadius: '12px',
    border: '1px solid var(--card-border)',
    background: 'var(--card-bg)',
    color: 'var(--text-main)',
    fontSize: '1rem',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
};

const labelStyle: React.CSSProperties = {
    fontSize: '0.8rem',
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    display: 'block',
    marginBottom: '6px',
};

export default function PayoutForm({ slug, initial }: Props) {
    const [banks, setBanks] = useState<BankInfo[]>([]);
    const [bankCode, setBankCode] = useState(initial.bankCode);
    const [accountNo, setAccountNo] = useState(initial.bankAccountNo);
    const [accountName, setAccountName] = useState(initial.bankAccountName);
    const [resolving, setResolving] = useState(false);
    const [resolveError, setResolveError] = useState('');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [saveError, setSaveError] = useState('');

    // Load bank list on mount
    useEffect(() => {
        fetch(`/api/store/${slug}/payout`)
            .then(r => r.json())
            .then(data => {
                if (data.banks) setBanks(data.banks);
            })
            .catch(() => {});
    }, [slug]);

    const resolveAccount = useCallback(async () => {
        if (accountNo.length !== 10 || !bankCode) return;
        setResolving(true);
        setResolveError('');
        setAccountName('');
        try {
            const res = await fetch(`/api/store/${slug}/payout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accountNumber: accountNo, bankCode }),
            });
            const data = await res.json();
            if (res.ok) {
                setAccountName(data.accountName);
            } else {
                setResolveError(data.message ?? 'Could not verify account number');
            }
        } catch {
            setResolveError('Network error verifying account');
        } finally {
            setResolving(false);
        }
    }, [accountNo, bankCode, slug]);

    // Auto-resolve when both bank + 10-digit account are set
    useEffect(() => {
        if (accountNo.length === 10 && bankCode) {
            resolveAccount();
        } else {
            setAccountName('');
            setResolveError('');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [accountNo, bankCode]);

    const handleSave = async () => {
        if (!bankCode || !accountNo || !accountName) return;
        setSaving(true);
        setSaveError('');
        setSaved(false);
        try {
            const res = await fetch(`/api/store/${slug}/payout`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bankCode, bankAccountNo: accountNo, bankAccountName: accountName }),
            });
            const data = await res.json();
            if (res.ok) {
                setSaved(true);
                setTimeout(() => setSaved(false), 3000);
            } else {
                setSaveError(data.message ?? 'Failed to save');
            }
        } catch {
            setSaveError('Network error, please try again.');
        } finally {
            setSaving(false);
        }
    };

    const canSave = !!bankCode && accountNo.length === 10 && !!accountName && !resolving;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Bank selector */}
            <div>
                <label style={labelStyle}>Bank</label>
                <select
                    value={bankCode}
                    onChange={e => setBankCode(e.target.value)}
                    style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}
                >
                    <option value="">Select your bank…</option>
                    {banks.map(b => (
                        <option key={b.code} value={b.code}>{b.name}</option>
                    ))}
                </select>
            </div>

            {/* Account number */}
            <div>
                <label style={labelStyle}>Account Number</label>
                <input
                    type="text"
                    inputMode="numeric"
                    pattern="\d*"
                    maxLength={10}
                    placeholder="0123456789"
                    value={accountNo}
                    onChange={e => setAccountNo(e.target.value.replace(/\D/g, ''))}
                    style={{
                        ...inputStyle,
                        letterSpacing: '2px',
                        fontFamily: 'monospace',
                        fontSize: '1.1rem',
                    }}
                />
            </div>

            {/* Account name (auto-resolved) */}
            <div style={{
                minHeight: '44px',
                background: accountName ? 'rgba(0,200,83,0.06)' : 'var(--bg-elevated)',
                border: `1px solid ${accountName ? 'rgba(0,200,83,0.25)' : 'var(--card-border)'}`,
                borderRadius: '12px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
            }}>
                {resolving ? (
                    <>
                        <div style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: 'var(--primary)',
                            animation: 'pulse 1.2s ease-in-out infinite',
                            flexShrink: 0,
                        }} />
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Verifying account…</span>
                    </>
                ) : resolveError ? (
                    <span style={{ fontSize: '0.9rem', color: '#e74c3c' }}>{resolveError}</span>
                ) : accountName ? (
                    <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00C853" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)' }}>{accountName}</span>
                    </>
                ) : (
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Account name will appear here after verification
                    </span>
                )}
            </div>

            {saveError && (
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#e74c3c', background: 'rgba(231,76,60,0.08)', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(231,76,60,0.2)' }}>
                    {saveError}
                </p>
            )}

            {saved && (
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--primary)', background: 'rgba(0,200,83,0.08)', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(0,200,83,0.2)' }}>
                    ✓ Payout account saved
                </p>
            )}

            <button
                onClick={handleSave}
                disabled={!canSave || saving}
                style={{
                    padding: '14px',
                    borderRadius: '12px',
                    background: canSave && !saving ? 'var(--primary)' : 'var(--card-border)',
                    color: canSave && !saving ? '#000' : 'var(--text-muted)',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    border: 'none',
                    cursor: canSave && !saving ? 'pointer' : 'not-allowed',
                    transition: 'background 0.2s',
                }}
            >
                {saving ? 'Saving…' : 'Save Payout Account'}
            </button>
        </div>
    );
}
