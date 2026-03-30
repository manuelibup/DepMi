'use client';

import { useState } from 'react';

const CATEGORIES = [
    { value: 'FASHION', label: 'Fashion' },
    { value: 'GADGETS', label: 'Gadgets' },
    { value: 'BEAUTY', label: 'Beauty' },
    { value: 'COSMETICS', label: 'Cosmetics' },
    { value: 'FOOD', label: 'Food' },
    { value: 'FURNITURE', label: 'Furniture' },
    { value: 'VEHICLES', label: 'Vehicles' },
    { value: 'SERVICES', label: 'Services' },
    { value: 'TRANSPORT', label: 'Transport' },
    { value: 'SPORT', label: 'Sport' },
    { value: 'HOUSING', label: 'Housing' },
    { value: 'BOOKS', label: 'Books' },
    { value: 'COURSE', label: 'Course' },
    { value: 'OTHER', label: 'Other' },
];

export default function NotifPrefsForm({ initial }: { initial: string[] }) {
    const [selected, setSelected] = useState<string[]>(initial);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');

    const toggle = (cat: string) => {
        setSelected((prev) =>
            prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
        );
        setStatus('idle');
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/user/notif-prefs', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notifDemandCategories: selected }),
            });
            setStatus(res.ok ? 'saved' : 'error');
        } catch {
            setStatus('error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{
            marginTop: 32,
            padding: '20px',
            background: 'var(--bg-elevated)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-color, rgba(0,0,0,0.08))',
        }}>
            <h2 style={{ margin: '0 0 6px', fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Request Notifications
            </h2>
            <p style={{ margin: '0 0 16px', fontSize: '0.83rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Choose which categories to be notified about when buyers post requests.
                Leave all unselected to receive notifications for every category.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {CATEGORIES.map(({ value, label }) => {
                    const active = selected.includes(value);
                    return (
                        <button
                            key={value}
                            onClick={() => toggle(value)}
                            style={{
                                padding: '6px 14px',
                                borderRadius: 20,
                                border: '1.5px solid',
                                borderColor: active ? 'var(--primary, var(--primary))' : 'var(--border-color, rgba(0,0,0,0.12))',
                                background: active ? 'var(--primary, var(--primary))' : 'transparent',
                                color: active ? '#fff' : 'var(--text-main)',
                                fontSize: '0.82rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                            }}
                        >
                            {label}
                        </button>
                    );
                })}
            </div>

            <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                        padding: '10px 24px',
                        background: 'var(--primary, var(--primary))',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        cursor: saving ? 'not-allowed' : 'pointer',
                        opacity: saving ? 0.7 : 1,
                    }}
                >
                    {saving ? 'Saving…' : 'Save Preferences'}
                </button>
                {status === 'saved' && (
                    <span style={{ fontSize: '0.85rem', color: 'var(--primary, var(--primary))', fontWeight: 600 }}>Saved!</span>
                )}
                {status === 'error' && (
                    <span style={{ fontSize: '0.85rem', color: '#D63031', fontWeight: 600 }}>Failed — try again.</span>
                )}
            </div>
        </div>
    );
}
