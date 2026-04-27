'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

interface UserStore {
    id: string;
    name: string;
    slug: string;
}

export default function BotConnectPage() {
    const searchParams = useSearchParams();
    const tokenId = searchParams.get('token');

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [stores, setStores] = useState<UserStore[]>([]);
    const [selectedStoreId, setSelectedStoreId] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(false);
    const [connectedStoreName, setConnectedStoreName] = useState('');

    useEffect(() => {
        if (!tokenId) {
            setError('No connection token provided. Send /connect in the DepMi bot to get a link.');
            setLoading(false);
            return;
        }

        Promise.all([
            fetch(`/api/bot/connect?token=${tokenId}`),
            fetch('/api/user/stores'),
        ]).then(async ([tokenRes, storesRes]) => {
            if (tokenRes.status === 401) {
                window.location.href = `/login?callbackUrl=${encodeURIComponent(window.location.href)}`;
                return;
            }
            if (!tokenRes.ok) {
                const json = await tokenRes.json();
                setError(json.error || 'This link is invalid or has expired.');
                return;
            }
            if (storesRes.ok) {
                const json = await storesRes.json();
                const list: UserStore[] = json.stores || [];
                setStores(list);
                if (list.length === 1) setSelectedStoreId(list[0].id);
            }
        }).catch(() => setError('Failed to load. Please try again.'))
          .finally(() => setLoading(false));
    }, [tokenId]);

    const handleConnect = async () => {
        if (!selectedStoreId) { toast.error('Please select a store.'); return; }
        setSubmitting(true);
        try {
            const res = await fetch('/api/bot/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tokenId, storeId: selectedStoreId }),
            });
            const data = await res.json();
            if (!res.ok) { toast.error(data.error || 'Failed to connect.'); return; }
            setConnectedStoreName(data.storeName);
            setDone(true);
        } catch {
            toast.error('Something went wrong. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <main style={pageStyle}>
                <div style={cardStyle}>
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>
                        Loading…
                    </div>
                </div>
            </main>
        );
    }

    if (error) {
        return (
            <main style={pageStyle}>
                <div style={cardStyle}>
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                        <div style={{ fontSize: '2rem', marginBottom: 12 }}>⚠️</div>
                        <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>Link expired or invalid</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 24 }}>{error}</div>
                    </div>
                </div>
            </main>
        );
    }

    if (done) {
        return (
            <main style={pageStyle}>
                <div style={cardStyle}>
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                        <div style={{ fontSize: '3rem', marginBottom: 16 }}>✅</div>
                        <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-primary)', marginBottom: 8 }}>
                            Connected!
                        </div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                            Your Telegram is now linked to <strong>{connectedStoreName}</strong>.<br />
                            Go back to the bot and send a photo to list your first product.
                        </div>
                    </div>
                </div>
            </main>
        );
    }

    if (stores.length === 0) {
        return (
            <main style={pageStyle}>
                <div style={cardStyle}>
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                        <div style={{ fontSize: '2rem', marginBottom: 12 }}>🏪</div>
                        <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>No stores found</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 24 }}>
                            You need a DepMi store before you can connect the bot.
                        </div>
                        <a href="/store/create" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
                            Create a store →
                        </a>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main style={pageStyle}>
            <div style={cardStyle}>
                <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: '1.8rem', marginBottom: 12 }}>🔗</div>
                    <div style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--text-primary)', marginBottom: 6 }}>
                        Connect Telegram Bot
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                        Link your Telegram account to a DepMi store. Once connected, send photos directly in Telegram to list products — no browser needed.
                    </div>
                </div>

                {stores.length > 1 && (
                    <div style={{ marginBottom: 20 }}>
                        <label style={labelStyle}>Which store should this bot manage?</label>
                        <select
                            value={selectedStoreId}
                            onChange={(e) => setSelectedStoreId(e.target.value)}
                            style={inputStyle}
                        >
                            <option value="">— Select a store —</option>
                            {stores.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                {stores.length === 1 && (
                    <div style={{
                        padding: '12px 14px', borderRadius: 12, marginBottom: 20,
                        background: 'rgba(255,92,56,0.06)', border: '1.5px solid rgba(255,92,56,0.2)',
                        fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600,
                    }}>
                        🏪 {stores[0].name}
                    </div>
                )}

                <button
                    onClick={handleConnect}
                    disabled={submitting || !selectedStoreId}
                    style={{
                        width: '100%', padding: '14px', borderRadius: 14, border: 'none',
                        background: submitting || !selectedStoreId ? 'rgba(255,92,56,0.4)' : 'var(--primary)',
                        color: '#fff', fontWeight: 800, fontSize: '1rem',
                        cursor: submitting || !selectedStoreId ? 'not-allowed' : 'pointer',
                    }}
                >
                    {submitting ? 'Connecting…' : 'Connect now'}
                </button>
            </div>
        </main>
    );
}

const pageStyle: React.CSSProperties = {
    minHeight: '100dvh',
    background: 'var(--bg-color)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: '40px 16px 48px',
};

const cardStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: 440,
    background: 'var(--bg-card)',
    borderRadius: 18,
    border: '1px solid var(--card-border)',
    padding: '28px 22px',
};

const labelStyle: React.CSSProperties = {
    display: 'block',
    fontWeight: 600,
    fontSize: '0.85rem',
    color: 'var(--text-primary)',
    marginBottom: 8,
};

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 10,
    border: '1px solid var(--border)',
    background: 'var(--bg-elevated)',
    color: 'var(--text-primary)',
    fontSize: '0.9rem',
    boxSizing: 'border-box',
    cursor: 'pointer',
};
