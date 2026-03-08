'use client';

import React, { useState } from 'react';

export default function InviteForm() {
    const [email, setEmail] = useState('');
    const [link, setLink] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;
        
        setLoading(true);
        setError('');
        setLink('');

        try {
            const res = await fetch('/api/admin/invite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await res.json();
            if (res.ok) {
                setLink(data.inviteUrl);
            } else {
                setError(data.error || 'Failed to generate link');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'grid', gap: '16px' }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '10px' }}>
                <input 
                    type="email" 
                    placeholder="Candidate Email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={{ flex: 1, background: 'var(--bg-elevated)', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '12px', color: 'var(--text-main)', fontSize: '0.9rem' }}
                />
                <button 
                    type="submit" 
                    disabled={loading}
                    style={{ background: 'var(--primary)', color: '#000', border: 'none', borderRadius: '8px', padding: '0 20px', fontWeight: 700, cursor: 'pointer', opacity: loading ? 0.7 : 1 }}
                >
                    {loading ? 'Generating...' : 'Generate Link'}
                </button>
            </form>

            {error && <p style={{ color: '#e74c3c', fontSize: '0.85rem', margin: 0 }}>{error}</p>}

            {link && (
                <div style={{ background: 'rgba(255, 215, 0, 0.05)', border: '1px dashed var(--primary)', borderRadius: '8px', padding: '12px', marginTop: '4px' }}>
                    <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Invite Link Generated:</p>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <code style={{ flex: 1, background: 'var(--bg-main)', padding: '8px', borderRadius: '4px', fontSize: '0.8rem', overflowWrap: 'anywhere' }}>{link}</code>
                        <button 
                            type="button"
                            onClick={() => {
                                navigator.clipboard.writeText(link);
                                alert('Link copied!');
                            }}
                            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--card-border)', borderRadius: '4px', padding: '8px', cursor: 'pointer' }}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-main)" strokeWidth="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
                        </button>
                    </div>
                </div>
            )}
            
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Links expire in 7 days.</p>
        </div>
    );
}
