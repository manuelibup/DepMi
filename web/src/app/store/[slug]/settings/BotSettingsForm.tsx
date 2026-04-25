'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface BotStoreData {
    slug: string;
    phoneNumber: string | null;
    botEnabled: boolean;
    whatsappLinked: boolean;
    instagramHandle: string | null;
    twitterHandle: string | null;
}

export default function BotSettingsForm({ store }: { store: BotStoreData }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        botEnabled: store.botEnabled,
        instagramHandle: store.instagramHandle || '',
        twitterHandle: store.twitterHandle || '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch(`/api/store/${store.slug}/settings`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    botEnabled: form.botEnabled,
                    instagramHandle: form.instagramHandle.replace('@', '') || null,
                    twitterHandle: form.twitterHandle.replace('@', '') || null,
                }),
            });
            if (res.ok) {
                toast.success('Bot settings saved');
                router.refresh();
            } else {
                const data = await res.json().catch(() => ({}));
                toast.error(data.message || 'Failed to save bot settings');
            }
        } catch {
            toast.error('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    const statusBadge = (connected: boolean) => (
        <span style={{
            display: 'inline-block',
            padding: '2px 8px',
            borderRadius: 99,
            fontSize: '0.72rem',
            fontWeight: 700,
            background: connected ? 'rgba(34,197,94,0.12)' : 'rgba(234,179,8,0.1)',
            color: connected ? '#16a34a' : '#a16207',
            border: `1px solid ${connected ? 'rgba(34,197,94,0.3)' : 'rgba(234,179,8,0.3)'}`,
            marginLeft: 8,
        }}>
            {connected ? 'Connected' : 'Not linked'}
        </span>
    );

    return (
        <form onSubmit={handleSubmit} style={{ marginTop: 24 }}>
            {/* Section header */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                margin: '0 0 16px',
                padding: '0 0 10px',
                borderBottom: '1px solid var(--border)',
            }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 8V4H8" /><rect width="16" height="12" x="4" y="8" rx="2" /><path d="M2 14h2" /><path d="M20 14h2" /><path d="M15 13v2" /><path d="M9 13v2" />
                </svg>
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>DepMi Bot</span>
            </div>

            {/* Enable toggle */}
            <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                    <div>
                        <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)', marginBottom: 2 }}>Enable DepMi Bot</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            Forward a WhatsApp photo with a price and the bot lists it automatically
                        </div>
                    </div>
                    <input
                        type="checkbox"
                        checked={form.botEnabled}
                        onChange={(e) => setForm(f => ({ ...f, botEnabled: e.target.checked }))}
                        style={{ accentColor: 'var(--primary)', width: 18, height: 18, flexShrink: 0 }}
                    />
                </label>
            </div>

            {form.botEnabled && (
                <>
                    {/* WhatsApp status (read-only) */}
                    <div style={{
                        padding: '12px 14px',
                        borderRadius: 10,
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--card-border)',
                        marginBottom: 14,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                                    WhatsApp
                                    {statusBadge(store.whatsappLinked)}
                                </div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 3 }}>
                                    {store.phoneNumber
                                        ? `Messages from ${store.phoneNumber} will create listings automatically`
                                        : 'Add your phone number in Store Settings to enable WhatsApp auto-listing'}
                                </div>
                            </div>
                        </div>
                        {!store.phoneNumber && (
                            <div style={{
                                marginTop: 10,
                                padding: '8px 12px',
                                borderRadius: 8,
                                background: 'rgba(234,179,8,0.08)',
                                border: '1px solid rgba(234,179,8,0.25)',
                                fontSize: '0.78rem',
                                color: '#ca8a04',
                            }}>
                                <strong>Action needed:</strong> Go to your store&apos;s general settings and add a phone number so the bot can match your WhatsApp.
                            </div>
                        )}
                    </div>

                    {/* Instagram handle */}
                    <div style={{ marginBottom: 14 }}>
                        <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: 6 }}>
                            Instagram Handle
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>@</span>
                            <input
                                type="text"
                                value={form.instagramHandle}
                                onChange={(e) => setForm(f => ({ ...f, instagramHandle: e.target.value.replace('@', '') }))}
                                placeholder="yourbrand"
                                maxLength={50}
                                style={{
                                    flex: 1,
                                    padding: '9px 12px',
                                    borderRadius: 10,
                                    border: '1px solid var(--border)',
                                    background: 'var(--bg-elevated)',
                                    color: 'var(--text-primary)',
                                    fontSize: '0.85rem',
                                }}
                            />
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                            When you tag @depmibot in a comment on your post, the bot will reply with a link to list it on DepMi.
                        </p>
                    </div>

                    {/* Twitter/X handle */}
                    <div style={{ marginBottom: 20 }}>
                        <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: 6 }}>
                            X (Twitter) Handle
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>@</span>
                            <input
                                type="text"
                                value={form.twitterHandle}
                                onChange={(e) => setForm(f => ({ ...f, twitterHandle: e.target.value.replace('@', '') }))}
                                placeholder="yourbrand"
                                maxLength={50}
                                style={{
                                    flex: 1,
                                    padding: '9px 12px',
                                    borderRadius: 10,
                                    border: '1px solid var(--border)',
                                    background: 'var(--bg-elevated)',
                                    color: 'var(--text-primary)',
                                    fontSize: '0.85rem',
                                }}
                            />
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                            Tag @depmibot in a tweet with your product photo and the bot will reply in the thread with a listing link.
                        </p>
                    </div>
                </>
            )}

            <button
                type="submit"
                disabled={loading}
                style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: 12,
                    background: 'var(--primary)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    border: 'none',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.7 : 1,
                }}
            >
                {loading ? 'Saving...' : 'Save Bot Settings'}
            </button>
        </form>
    );
}
