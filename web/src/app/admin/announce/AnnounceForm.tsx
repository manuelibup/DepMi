'use client';

import { useState } from 'react';

export default function AnnounceForm() {
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [link, setLink] = useState('');
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState<{ message: string; count?: number } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !body.trim()) return;

        setSending(true);
        setResult(null);
        try {
            const res = await fetch('/api/admin/announce', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: title.trim(), body: body.trim(), link: link.trim() || undefined }),
            });
            const data = await res.json();
            setResult(data);
            if (res.ok) {
                setTitle('');
                setBody('');
                setLink('');
            }
        } catch {
            setResult({ message: 'Network error — please try again.' });
        } finally {
            setSending(false);
        }
    };

    const inputStyle: React.CSSProperties = {
        width: '100%',
        padding: '10px 14px',
        fontSize: '0.95rem',
        borderRadius: 8,
        border: '1.5px solid var(--border-color, rgba(0,0,0,0.12))',
        background: 'var(--bg-color)',
        color: 'var(--text-main)',
        outline: 'none',
        boxSizing: 'border-box',
    };

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 560 }}>
            <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: 'var(--text-muted)' }}>
                    Title *
                </label>
                <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={100}
                    placeholder="e.g. New feature: Infinite scroll is live!"
                    style={inputStyle}
                    required
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{title.length}/100</span>
            </div>

            <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: 'var(--text-muted)' }}>
                    Message *
                </label>
                <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    maxLength={500}
                    rows={4}
                    placeholder="Write your announcement here…"
                    style={{ ...inputStyle, resize: 'vertical' }}
                    required
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{body.length}/500</span>
            </div>

            <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: 'var(--text-muted)' }}>
                    Link (optional)
                </label>
                <input
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    placeholder="e.g. /explore or https://depmi.com/blog"
                    style={inputStyle}
                />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <button
                    type="submit"
                    disabled={sending || !title.trim() || !body.trim()}
                    style={{
                        padding: '11px 28px',
                        background: '#059669',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        fontWeight: 700,
                        fontSize: '0.95rem',
                        cursor: sending ? 'not-allowed' : 'pointer',
                        opacity: sending || !title.trim() || !body.trim() ? 0.6 : 1,
                    }}
                >
                    {sending ? 'Sending…' : 'Broadcast to All Users'}
                </button>
            </div>

            {result && (
                <p style={{
                    padding: '12px 16px',
                    borderRadius: 8,
                    background: result.count ? 'rgba(5,150,105,0.08)' : 'rgba(214,48,49,0.08)',
                    color: result.count ? '#059669' : '#D63031',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    margin: 0,
                }}>
                    {result.message}
                </p>
            )}
        </form>
    );
}
