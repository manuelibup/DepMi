'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

type CheckState = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

export default function OnboardingPage() {
    const { data: session, status, update } = useSession();
    const router = useRouter();

    const [username, setUsername] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [checkState, setCheckState] = useState<CheckState>('idle');
    const [checkMsg, setCheckMsg] = useState('');
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (session?.user?.name && !displayName) {
            setDisplayName(session.user.name);
        }
        if (status === 'authenticated' && session.user.username) {
            router.push('/');
        }
    }, [session, status, router, displayName]);

    const handleUsernameChange = (raw: string) => {
        // Strip invalid characters client-side immediately
        const cleaned = raw.toLowerCase().replace(/[^a-z0-9_]/g, '');
        setUsername(cleaned);

        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (cleaned.length === 0) { setCheckState('idle'); setCheckMsg(''); return; }
        if (cleaned.length < 3)  { setCheckState('invalid'); setCheckMsg('At least 3 characters required'); return; }
        if (cleaned.length > 20) { setCheckState('invalid'); setCheckMsg('Maximum 20 characters'); return; }

        setCheckState('checking');
        setCheckMsg('');

        debounceRef.current = setTimeout(async () => {
            try {
                const res = await fetch(`/api/user/check-username?username=${encodeURIComponent(cleaned)}`);
                const data = await res.json();
                if (data.available) {
                    setCheckState('available');
                    setCheckMsg('@' + cleaned + ' is available');
                } else {
                    setCheckState('taken');
                    setCheckMsg(data.reason ?? 'Username not available');
                }
            } catch {
                setCheckState('idle');
                setCheckMsg('');
            }
        }, 400);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (checkState !== 'available') return;
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/user/onboarding', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, displayName }),
            });

            const data = await res.json();

            if (!res.ok) {
                // Username might have been snagged between check and submit
                if (data.message?.toLowerCase().includes('taken')) {
                    setCheckState('taken');
                    setCheckMsg('Username just got taken — try another');
                }
                throw new Error(data.message || 'Failed to complete onboarding');
            }

            await update({ username, name: displayName });
            router.push('/');
            router.refresh();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const inputBorderColor =
        checkState === 'available' ? 'var(--primary)' :
        checkState === 'taken' || checkState === 'invalid' ? '#e74c3c' :
        undefined;

    const checkColor =
        checkState === 'available' ? 'var(--primary)' :
        checkState === 'taken' || checkState === 'invalid' ? '#e74c3c' :
        'var(--text-muted)';

    const canSubmit = !loading && displayName.trim().length >= 2 && checkState === 'available';

    if (status === 'loading') {
        return (
            <div className={styles.main}>
                <div className={styles.container}>
                    <p className={styles.subtitle}>Loading identity...</p>
                </div>
            </div>
        );
    }

    if (status === 'unauthenticated') {
        router.push('/login');
        return null;
    }

    return (
        <main className={styles.main}>
            <div className={styles.bgBlob} />

            <div className={styles.container}>
                <div className={styles.header}>
                    <h1 className={styles.title}>Set up your profile</h1>
                    <p className={styles.subtitle}>Choose a unique username to start discovery on DepMi.</p>
                </div>

                {error && (
                    <div className={styles.error}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        {error}
                    </div>
                )}

                <form className={styles.form} onSubmit={handleSubmit}>
                    <div className={styles.fieldGroup}>
                        <label className={styles.label}>Display Name</label>
                        <div className={styles.inputWrapper}>
                            <svg className={styles.inputIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                            </svg>
                            <input
                                type="text"
                                className={styles.input}
                                placeholder="How should people address you?"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                required
                                disabled={loading}
                            />
                        </div>
                    </div>

                    <div className={styles.fieldGroup}>
                        <label className={styles.label}>
                            Pick a Username
                            <span className={styles.hint}>Letters, numbers, underscores · 3–20 chars</span>
                        </label>
                        <div className={styles.inputWrapper} style={inputBorderColor ? { outline: `2px solid ${inputBorderColor}`, borderRadius: '12px' } : undefined}>
                            <span className={styles.usernamePrefix}>@</span>
                            <input
                                type="text"
                                className={`${styles.input} ${styles.inputWithPrefix}`}
                                placeholder="username"
                                value={username}
                                onChange={(e) => handleUsernameChange(e.target.value)}
                                required
                                disabled={loading}
                                maxLength={20}
                                autoComplete="off"
                                autoCorrect="off"
                                autoCapitalize="off"
                                spellCheck={false}
                            />
                            {/* Availability indicator */}
                            {checkState === 'checking' && (
                                <span style={{ marginRight: '12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>checking...</span>
                            )}
                            {checkState === 'available' && (
                                <svg style={{ marginRight: '12px', flexShrink: 0, color: 'var(--primary)' }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
                            )}
                            {(checkState === 'taken' || checkState === 'invalid') && (
                                <svg style={{ marginRight: '12px', flexShrink: 0, color: '#e74c3c' }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
                            )}
                        </div>
                        {checkMsg && (
                            <p style={{ margin: '6px 0 0 4px', fontSize: '0.8rem', color: checkColor, fontWeight: 500 }}>
                                {checkMsg}
                            </p>
                        )}
                    </div>

                    <button type="submit" className={styles.submitBtn} disabled={!canSubmit}>
                        {loading ? 'Setting up...' : 'Get Started'}
                        {!loading && (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M5 12h14m-7-7 7 7-7 7" />
                            </svg>
                        )}
                    </button>
                </form>
            </div>
        </main>
    );
}
