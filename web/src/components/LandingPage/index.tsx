'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { signIn } from 'next-auth/react';
import { useScrollDirection } from '@/hooks/useScrollDirection';
import styles from './LandingPage.module.css';

export default function LandingPage() {
    const isVisible = useScrollDirection();

    return (
        <div className={styles.container}>
            <header className={`${styles.header} ${!isVisible ? styles.headerHidden : ''}`}>
                <div className={styles.nav}>
                    <div className={styles.logo}>
                        <Image src="/depmi-logo.svg" alt="DepMi Logo" width={32} height={32} />
                        <span>DepMi</span>
                    </div>
                    <div className={styles.navActions}>
                        <button onClick={() => signIn()} className={styles.loginBtn}>Log in</button>
                        <Link href="/register" className={styles.signupBtn}>Sign up</Link>
                    </div>
                </div>
            </header>

            <main className={styles.main}>
                <div className={styles.heroSection}>
                    <div className={styles.heroContent}>
                        <h1 className={styles.title}>
                            Buy Here.<br />
                            Build Here.<br />
                            Grow Here.
                        </h1>
                        <p className={styles.subtitle}>
                            DepMi is where the best people find new products, projects, and deals.
                            It's social commerce reimagined with Escrow security.
                        </p>

                        <div className={styles.authBox}>
                            <button
                                onClick={() => signIn('google')}
                                className={styles.googleBtn}
                            >
                                <Image src="/google-icon.svg" alt="Google" width={20} height={20} />
                                Sign up with Google
                            </button>

                            <div className={styles.divider}>
                                <span>or</span>
                            </div>

                            <Link href="/register" className={styles.createAccountBtn}>
                                Create account
                            </Link>

                            <p className={styles.terms}>
                                By signing up, you agree to the <Link href="/terms">Terms of Service</Link> and <Link href="/privacy">Privacy Policy</Link>.
                            </p>
                        </div>

                        <div className={styles.alreadyHaveAccount}>
                            <h3>Already have an account?</h3>
                            <button onClick={() => signIn()} className={styles.signInLink}>Sign in</button>
                        </div>
                    </div>

                    <div className={styles.heroVisual}>
                        <div className={styles.phoneMockup}>
                            <div className={styles.phoneScreen}>
                                <div className={styles.mockHeader}>
                                    <div className={styles.mockSearch}>Search DepMi...</div>
                                </div>
                                <Image
                                    src="/app-screenshot-v3.png"
                                    alt="DepMi App Feed"
                                    width={375}
                                    height={812}
                                    className={styles.realScreenshot}
                                    priority
                                />
                            </div>
                        </div>
                        <div className={styles.glow} />
                    </div>
                </div>
            </main>

            <footer className={styles.footer}>
                <nav className={styles.footerLinks}>
                    <Link href="/about">About</Link>
                    <Link href="/help">Help Center</Link>
                    <Link href="/terms">Terms</Link>
                    <Link href="/privacy">Privacy</Link>
                    <Link href="/blog">Blog</Link>
                    <Link href="/careers">Careers</Link>
                    <span>© 2026 DepMi, Inc.</span>
                </nav>
            </footer>
        </div>
    );
}
