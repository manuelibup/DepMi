'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Mail, MessageSquarePlus, Zap, ShieldCheck } from 'lucide-react';
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
                if (res.status === 409) {
                    throw new Error('You are already on the list! We will reach out soon.');
                }
                throw new Error(data.message || 'Something went wrong');
            }

            setStatus('success');
            setMessage('Welcome to the future of trade! Check your inbox soon.');
            setEmail('');
        } catch (error: unknown) {
            setStatus('error');
            setMessage(error instanceof Error ? error.message : 'Something went wrong');
        }
    };

    return (
        <main className={styles.main}>
            {/* Background Orbs */}
            <div className={styles.bgBlob1} />
            <div className={styles.bgBlob2} />

            <div className={styles.container}>
                {/* Branding */}
                <div className={styles.brandHeader}>
                    <Image
                        src="/depmi-logo.svg"
                        alt="DepMi Logo"
                        width={64}
                        height={64}
                        className={styles.brandLogo}
                        priority
                    />
                    <h2 className={styles.brandName}>DepMi</h2>
                </div>

                <div className={styles.badge}>
                    <span className={styles.pulseDot} />
                    Coming Soon
                </div>

                <h1 className={styles.title}>
                    Buy & Sell as Easily as <br />
                    <span className={styles.titleHighlight}>Liking a Post</span>
                </h1>

                <p className={styles.subtitle}>
                    DepMi brings trust to social commerce. Buyers find exactly what they need; sellers find customers waiting for them. Simple, social, and secure.
                </p>

                <form onSubmit={handleSubmit} className={styles.formCard}>
                    <div className={styles.inputWrapper}>
                        <Mail className={styles.inputIcon} size={20} />
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
                        {status === 'loading' ? 'Joining...' : 'Get Early Access'}
                    </button>
                </form>

                {message && (
                    <p className={`${styles.message} ${status === 'success' ? styles.messageSuccess : styles.messageError}`}>
                        {message}
                    </p>
                )}

                {/* How it Works Section */}
                <div className={styles.featuresGrid}>
                    <div className={styles.featureCard}>
                        <div className={styles.featureIconWrapper}>
                            <MessageSquarePlus className={styles.featureIcon} size={32} />
                        </div>
                        <h3 className={styles.featureTitle}>Never search again</h3>
                        <p className={styles.featureText}>
                            Buyers: Post what you need and wait. <br />
                            Sellers: We alert you when someone wants what you sell.
                        </p>
                    </div>
                    <div className={styles.featureCard}>
                        <div className={styles.featureIconWrapper}>
                            <Zap className={styles.featureIcon} size={32} />
                        </div>
                        <h3 className={styles.featureTitle}>Sell with a tap</h3>
                        <p className={styles.featureText}>
                            Sellers: Turn social posts into sales in seconds. <br />
                            Buyers: See it, like it, buy it.
                        </p>
                    </div>
                    <div className={styles.featureCard}>
                        <div className={styles.featureIconWrapper}>
                            <ShieldCheck className={styles.featureIcon} size={32} />
                        </div>
                        <h3 className={styles.featureTitle}>Peace of mind</h3>
                        <p className={styles.featureText}>
                            Money is held safely until the item is delivered. <br />
                            No more &apos;pay before delivery&apos; stress.
                        </p>
                    </div>
                </div>
            </div>
        </main>
    );
}
