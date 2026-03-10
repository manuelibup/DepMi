'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function OnboardingPage() {
    const { data: session, status, update } = useSession();
    const router = useRouter();

    const [username, setUsername] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Pre-fill display name from session if available
    useEffect(() => {
        if (session?.user?.name && !displayName) {
            setDisplayName(session.user.name);
        }

        // Redirect if they ALREADY have a username
        if (status === 'authenticated' && session.user.username) {
            router.push('/');
        }
    }, [session, status, router, displayName]);

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
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
                throw new Error(data.message || 'Failed to complete onboarding');
            }

            // Force session refresh to include the new username
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
                        <label className={styles.label}>
                            Display Name
                        </label>
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
                            <span className={styles.hint}>Characters, numbers, underscores</span>
                        </label>
                        <div className={styles.inputWrapper}>
                            <span className={styles.usernamePrefix}>@</span>
                            <input
                                type="text"
                                className={`${styles.input} ${styles.inputWithPrefix}`}
                                placeholder="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                                required
                                disabled={loading}
                            />
                        </div>
                    </div>

                    <button type="submit" className={styles.submitBtn} disabled={loading || !username || !displayName}>
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
