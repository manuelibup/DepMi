'use client';

import React, { useState } from 'react';

export default function BulkFollowForm() {
    const [username, setUsername] = useState('');
    const [count, setCount] = useState(50);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username || count <= 0) return;

        setLoading(true);
        setStatus(null);

        try {
            const res = await fetch('/api/admin/bulk-follow', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, count })
            });

            const data = await res.json();
            if (res.ok) {
                setStatus({ type: 'success', message: data.message });
                setUsername('');
            } else {
                setStatus({ type: 'error', message: data.error || 'Failed to assign followers' });
            }
        } catch (err) {
            setStatus({ type: 'error', message: 'Network error. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'grid', gap: '16px' }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <input
                    type="text"
                    placeholder="Username (without @)"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    style={{ flex: 2, minWidth: '150px', background: 'var(--bg-elevated)', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '12px', color: 'var(--text-main)', fontSize: '0.9rem' }}
                />
                <input
                    type="number"
                    placeholder="Count"
                    value={count}
                    onChange={(e) => setCount(parseInt(e.target.value))}
                    required
                    min="1"
                    max="1000"
                    style={{ flex: 1, minWidth: '80px', background: 'var(--bg-elevated)', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '12px', color: 'var(--text-main)', fontSize: '0.9rem' }}
                />
                <button
                    type="submit"
                    disabled={loading}
                    style={{ background: 'var(--primary)', color: '#000', border: 'none', borderRadius: '8px', padding: '0 20px', fontWeight: 700, cursor: 'pointer', opacity: loading ? 0.7 : 1, height: '46px' }}
                >
                    {loading ? 'Processing...' : 'Assign Followers'}
                </button>
            </form>

            {status && (
                <p style={{
                    color: status.type === 'success' ? '#2ecc71' : '#e74c3c',
                    fontSize: '0.85rem',
                    margin: 0,
                    background: status.type === 'success' ? 'rgba(46, 204, 113, 0.1)' : 'rgba(231, 76, 60, 0.1)',
                    padding: '8px 12px',
                    borderRadius: '6px'
                }}>
                    {status.message}
                </p>
            )}

            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                This tool will pick random users to follow the target.
            </p>
        </div>
    );
}
