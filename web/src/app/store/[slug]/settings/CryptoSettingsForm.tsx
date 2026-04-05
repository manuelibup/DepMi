'use client';

import React, { useState } from 'react';
import { ConnectButton, useActiveAccount } from 'thirdweb/react';
import { createThirdwebClient } from 'thirdweb';
import { inAppWallet } from 'thirdweb/wallets';
import styles from './page.module.css';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const client = createThirdwebClient({
    clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID!,
});

interface Props {
    slug: string;
    initialEnabled: boolean;
    initialWalletAddr: string | null;
}

export default function CryptoSettingsForm({ slug, initialWalletAddr }: Props) {
    const router = useRouter();
    const account = useActiveAccount();
    const [walletAddr, setWalletAddr] = useState<string | null>(initialWalletAddr);
    const [saving, setSaving] = useState(false);

    const connectedAddress = account?.address ?? null;

    async function saveWallet(addr: string | null) {
        setSaving(true);
        try {
            const res = await fetch(`/api/store/${slug}/settings`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cryptoWalletAddr: addr,
                    cryptoPaymentsEnabled: addr !== null,
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                setWalletAddr(addr);
                toast.success(addr ? 'Payout wallet saved' : 'Wallet removed');
                router.refresh();
            } else {
                toast.error(data.message || 'Save failed');
            }
        } catch {
            toast.error('Network error');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className={styles.formCard} style={{ marginTop: '24px' }}>
            <div>
                <h2 className={styles.title} style={{ marginBottom: '4px' }}>Crypto Payouts (USDC)</h2>
                <p className={styles.helpText}>
                    Your store accepts USDC on Base L2 by default. Connect a wallet to receive payments — funds arrive instantly on delivery confirmation, no bank needed.{' '}
                    <a href="/help/crypto-payments" style={{ color: 'var(--primary)' }}>Learn more</a>
                </p>
            </div>

            {/* Wallet status */}
            <div style={{ paddingTop: '16px' }}>
                {walletAddr ? (
                    <div style={{ background: 'rgba(var(--primary-rgb),0.06)', border: '1px solid rgba(var(--primary-rgb),0.2)', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700, marginBottom: 4 }}>Payout wallet active</div>
                        <div style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: 'var(--text-main)', wordBreak: 'break-all' }}>
                            {walletAddr}
                        </div>
                    </div>
                ) : (
                    <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
                        <div style={{ fontSize: '0.78rem', color: '#d97706', fontWeight: 600, marginBottom: 2 }}>No payout wallet set</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Connect one below. Buyers can still pay with card until you set this up.
                        </div>
                    </div>
                )}

                <ConnectButton
                    client={client}
                    wallets={[inAppWallet()]}
                    connectButton={{ label: walletAddr ? 'Switch wallet' : 'Create payout wallet' }}
                    detailsButton={{ displayBalanceToken: undefined }}
                />

                {connectedAddress && connectedAddress !== walletAddr && (
                    <div style={{ marginTop: 12 }}>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                            Connected:{' '}
                            <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-main)' }}>
                                {connectedAddress.slice(0, 6)}…{connectedAddress.slice(-4)}
                            </span>
                        </p>
                        <button
                            type="button"
                            className={styles.submitBtn}
                            onClick={() => saveWallet(connectedAddress)}
                            disabled={saving}
                        >
                            {saving ? 'Saving…' : 'Use this wallet for payouts'}
                        </button>
                    </div>
                )}

                {walletAddr && (
                    <button
                        type="button"
                        onClick={() => saveWallet(null)}
                        disabled={saving}
                        style={{
                            marginTop: 12,
                            background: 'none',
                            border: 'none',
                            color: '#ef4444',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            fontWeight: 600,
                            padding: 0,
                            display: 'block',
                        }}
                    >
                        Remove wallet
                    </button>
                )}
            </div>

            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 14 }}>
                USDC lands directly in your wallet — convert to naira using any crypto exchange of your choice.
                DepMi takes 5% (buyer) + 5% (seller) on crypto sales — same as card.{' '}
                {walletAddr && <Link href={`/store/${slug}/wallet`} style={{ color: 'var(--primary)' }}>View wallet balance →</Link>}
            </p>
        </div>
    );
}
