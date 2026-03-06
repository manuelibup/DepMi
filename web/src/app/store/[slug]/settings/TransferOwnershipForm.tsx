'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
    slug: string;
    storeName: string;
}

export default function TransferOwnershipForm({ slug, storeName }: Props) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [username, setUsername] = useState('');
    const [confirmName, setConfirmName] = useState('');
    const [transferring, setTransferring] = useState(false);
    const [error, setError] = useState('');

    // Both the username and the store name must be typed to confirm
    const canTransfer = username.trim().length > 0 && confirmName.trim() === storeName;

    const handleTransfer = async () => {
        if (!canTransfer) return;
        setTransferring(true);
        setError('');
        try {
            const res = await fetch(`/api/store/${slug}/transfer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: username.trim() }),
            });
            const data = await res.json();
            if (res.ok) {
                // Redirect away — current user no longer owns this store
                router.push('/profile');
            } else {
                setError(data.message ?? 'Transfer failed');
                setTransferring(false);
            }
        } catch {
            setError('Network error, please try again.');
            setTransferring(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Transfer ownership of <strong style={{ color: 'var(--text-main)' }}>{storeName}</strong> to another DepMi user.
                They must be BVN-verified (KYC Tier 2+). You will lose all access immediately.
            </p>

            {!open ? (
                <button
                    onClick={() => setOpen(true)}
                    style={{
                        padding: '13px',
                        borderRadius: '12px',
                        background: 'transparent',
                        color: '#e74c3c',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        border: '1.5px solid rgba(231,76,60,0.4)',
                        cursor: 'pointer',
                        transition: 'border-color 0.2s',
                    }}
                >
                    Transfer Ownership…
                </button>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', background: 'rgba(231,76,60,0.05)', border: '1px solid rgba(231,76,60,0.2)', borderRadius: '14px', padding: '18px' }}>
                    <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 600, color: '#e74c3c' }}>
                        This action is irreversible. Proceed carefully.
                    </p>

                    <div>
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            New Owner&apos;s Username
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
                            <span style={{ padding: '12px 0 12px 14px', color: 'var(--text-muted)', fontWeight: 600, flexShrink: 0 }}>@</span>
                            <input
                                type="text"
                                value={username}
                                onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                                placeholder="theirusername"
                                style={{ flex: 1, padding: '12px 14px 12px 6px', background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-main)', fontSize: '1rem', fontFamily: 'inherit' }}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Type store name to confirm
                        </label>
                        <input
                            type="text"
                            value={confirmName}
                            onChange={e => setConfirmName(e.target.value)}
                            placeholder={storeName}
                            style={{ padding: '12px 16px', borderRadius: '12px', border: `1px solid ${confirmName === storeName && confirmName.length > 0 ? 'rgba(231,76,60,0.5)' : 'var(--card-border)'}`, background: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '1rem', outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' }}
                        />
                        <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Type exactly: <strong>{storeName}</strong>
                        </p>
                    </div>

                    {error && (
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#e74c3c', background: 'rgba(231,76,60,0.08)', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(231,76,60,0.2)' }}>
                            {error}
                        </p>
                    )}

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            onClick={() => { setOpen(false); setUsername(''); setConfirmName(''); setError(''); }}
                            disabled={transferring}
                            style={{ flex: 1, padding: '13px', borderRadius: '12px', background: 'transparent', border: '1px solid var(--card-border)', color: 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleTransfer}
                            disabled={!canTransfer || transferring}
                            style={{
                                flex: 1,
                                padding: '13px',
                                borderRadius: '12px',
                                background: canTransfer && !transferring ? '#e74c3c' : 'var(--card-border)',
                                color: canTransfer && !transferring ? '#fff' : 'var(--text-muted)',
                                fontWeight: 700,
                                border: 'none',
                                cursor: canTransfer && !transferring ? 'pointer' : 'not-allowed',
                                fontSize: '0.9rem',
                            }}
                        >
                            {transferring ? 'Transferring…' : 'Transfer'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
