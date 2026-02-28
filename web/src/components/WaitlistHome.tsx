'use client';

import React, { useState } from 'react';
import styles from './WaitlistHome.module.css';

export default function WaitlistHome() {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        setStatus('loading');
        setMessage('');

        try {
            const res = await fetch('/api/waitlist', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Something went wrong');
            }

            setStatus('success');
            setMessage(data.message);
            setEmail('');
        } catch (error: any) {
            setStatus('error');
            setMessage(error.message);
        }
    };

    return (
        <main className={styles.main}>
            {/* Background Orbs */}
            <div className={styles.bgBlob1} />
            <div className={styles.bgBlob2} />

            <div className={styles.container}>
                <div className={styles.badge}>
                    <span className={styles.pulseDot} />
                    Coming Soon
                </div>

                <h1 className={styles.title}>
                    The Future of <br />
                    <span className={styles.titleHighlight}>Social Commerce</span>
                </h1>

                <p className={styles.subtitle}>
                    Join the waitlist to get early access to DepMi. Discover, bid, and trade seamlessly with trusted peers.
                </p>

                <form onSubmit={handleSubmit} className={styles.formCard}>
                    <div className={styles.inputWrapper}>
                        <svg
                            className={styles.inputIcon}
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <rect width="20" height="16" x="2" y="4" rx="2" />
                            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                        </svg>
                        <input
                            type="email"
                            className={styles.input}
                            placeholder="Enter your email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={status === 'loading' || status === 'success'}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className={styles.submitBtn}
                        disabled={status === 'loading' || status === 'success' || !email}
                    >
                        {status === 'loading' ? 'Joining...' : 'Join Waitlist'}
                    </button>
                </form>

                {message && (
                    <p className={`${styles.message} ${status === 'success' ? styles.messageSuccess : styles.messageError}`}>
                        {message}
                    </p>
                )}
            </div>
        </main>
    );
}
