'use client';

import { useEffect, useState } from 'react';
import { ConnectButton, useActiveAccount } from 'thirdweb/react';
import { createThirdwebClient } from 'thirdweb';
import { inAppWallet } from 'thirdweb/wallets';
import Link from 'next/link';

const USDC_ADDRESS = process.env.NODE_ENV === 'production'
    ? '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
    : '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

const BASE_RPC = process.env.NODE_ENV === 'production'
    ? 'https://mainnet.base.org'
    : 'https://sepolia.base.org';

const BASESCAN = process.env.NODE_ENV === 'production'
    ? 'https://basescan.org'
    : 'https://sepolia.basescan.org';

const client = createThirdwebClient({
    clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID!,
});

async function fetchUsdcBalance(address: string): Promise<string> {
    // balanceOf(address) selector = 0x70a08231
    const data = '0x70a08231' + address.slice(2).padStart(64, '0');
    try {
        const res = await fetch(BASE_RPC, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_call', params: [{ to: USDC_ADDRESS, data }, 'latest'], id: 1 }),
        });
        const json = await res.json();
        const raw = BigInt(json.result ?? '0x0');
        const usdc = Number(raw) / 1_000_000;
        return usdc.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } catch {
        return '—';
    }
}

export default function WalletClient({ slug, walletAddr }: { slug: string; walletAddr: string | null }) {
    const account = useActiveAccount();
    const [balance, setBalance] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const displayAddr = walletAddr ?? null;

    useEffect(() => {
        if (!displayAddr) return;
        fetchUsdcBalance(displayAddr).then(setBalance);
    }, [displayAddr]);

    function copy() {
        if (!displayAddr) return;
        navigator.clipboard.writeText(displayAddr);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    if (!displayAddr) {
        return (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>No payout wallet set up yet.</p>
                <Link
                    href={`/store/${slug}/settings`}
                    style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}
                >
                    Set up wallet in Settings →
                </Link>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Balance card */}
            <div style={{
                background: 'var(--card-bg)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)', padding: '24px 20px', textAlign: 'center',
            }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    USDC Balance · Base
                </div>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                    {balance === null ? <span style={{ opacity: 0.4 }}>Loading…</span> : `$${balance}`}
                </div>
            </div>

            {/* Address card */}
            <div style={{
                background: 'var(--card-bg)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)', padding: '16px 20px',
            }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>
                    Wallet Address
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: 'var(--text-primary)', wordBreak: 'break-all', flex: 1 }}>
                        {displayAddr}
                    </span>
                    <button
                        onClick={copy}
                        style={{
                            flexShrink: 0, padding: '6px 12px', borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border)', background: 'transparent',
                            color: copied ? 'var(--primary)' : 'var(--text-secondary)',
                            fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                        }}
                    >
                        {copied ? 'Copied!' : 'Copy'}
                    </button>
                </div>
                <a
                    href={`${BASESCAN}/address/${displayAddr}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'inline-block', marginTop: 10, fontSize: '0.78rem', color: 'var(--primary)', textDecoration: 'none' }}
                >
                    View on BaseScan ↗
                </a>
            </div>

            {/* Send / manage via ThirdWeb */}
            <div style={{
                background: 'var(--card-bg)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)', padding: '16px 20px',
            }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Send / Withdraw</div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0 0 12px' }}>
                    Connect your wallet to send USDC to any address or exchange.
                </p>
                <ConnectButton
                    client={client}
                    wallets={[inAppWallet()]}
                    connectButton={{ label: 'Connect to send' }}
                />
                {account && account.address.toLowerCase() !== displayAddr.toLowerCase() && (
                    <p style={{ marginTop: 10, fontSize: '0.75rem', color: '#f59e0b' }}>
                        Connected wallet doesn't match your payout address. Make sure you connect the right wallet.
                    </p>
                )}
            </div>

            {/* Gas note */}
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', padding: '0 4px' }}>
                Sending USDC requires a small amount of ETH on Base for gas (~$0.001). Receiving payments into this wallet is free — DepMi covers that gas.
            </p>
        </div>
    );
}
