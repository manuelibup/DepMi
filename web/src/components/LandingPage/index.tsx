'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { signIn } from 'next-auth/react';
import { useScrollDirection } from '@/hooks/useScrollDirection';
import styles from './LandingPage.module.css';

interface Stats {
    users: number;
    stores: number;
    listings: number;
}

interface Props {
    stats: Stats;
}

const CATEGORIES = [
    { label: 'Fashion', icon: '👗' },
    { label: 'Gadgets', icon: '📱' },
    { label: 'Beauty', icon: '💄' },
    { label: 'Food', icon: '🍔' },
    { label: 'Furniture', icon: '🛋️' },
    { label: 'Services', icon: '🔧' },
    { label: 'Transport', icon: '🚗' },
    { label: 'Books', icon: '📚' },
    { label: 'Sport', icon: '⚽' },
    { label: 'Housing', icon: '🏠' },
    { label: 'Courses', icon: '🎓' },
    { label: 'Other', icon: '✨' },
];

function fmt(n: number): string {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return String(n);
}

export default function LandingPage({ stats }: Props) {
    const isVisible = useScrollDirection();

    return (
        <div className={styles.container}>
            <header className={`${styles.header} ${!isVisible ? styles.headerHidden : ''}`}>
                <div className={styles.nav}>
                    <div className={styles.logo}>
                        <Image src="/depmi-logo.svg" alt="DepMi Logo" width={32} height={32} />
                        <span>DepMi</span>
                    </div>
                    <button onClick={() => signIn('google')} className={styles.navSignIn}>
                        Sign in
                    </button>
                </div>
            </header>

            <main className={styles.main}>
                {/* ── Hero ── */}
                <section className={styles.heroSection}>
                    <div className={styles.heroContent}>
                        <div className={styles.heroBadge}>Social Commerce · Escrow Protected</div>
                        <h1 className={styles.title}>
                            Buy Here.<br />
                            Build Here.<br />
                            Grow Here.
                        </h1>
                        <p className={styles.subtitle}>
                            DepMi is Nigeria's social commerce marketplace. Post what you need,
                            discover what's for sale, and pay safely with built-in Escrow.
                        </p>

                        <div className={styles.authBox}>
                            <button onClick={() => signIn('google')} className={styles.googleBtn}>
                                <Image src="/google-icon.svg" alt="Google" width={20} height={20} />
                                Continue with Google
                            </button>
                            <p className={styles.terms}>
                                By signing up, you agree to the{' '}
                                <Link href="/terms">Terms of Service</Link> and{' '}
                                <Link href="/privacy">Privacy Policy</Link>.
                            </p>
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
                </section>

                {/* ── Live stats ── */}
                <section className={styles.statsBar}>
                    <div className={styles.statItem}>
                        <span className={styles.statNumber}>{fmt(stats.users)}+</span>
                        <span className={styles.statLabel}>Members</span>
                    </div>
                    <div className={styles.statDivider} />
                    <div className={styles.statItem}>
                        <span className={styles.statNumber}>{fmt(stats.stores)}+</span>
                        <span className={styles.statLabel}>Active Stores</span>
                    </div>
                    <div className={styles.statDivider} />
                    <div className={styles.statItem}>
                        <span className={styles.statNumber}>{fmt(stats.listings)}+</span>
                        <span className={styles.statLabel}>Live Listings</span>
                    </div>
                </section>

                {/* ── How it works ── */}
                <section className={styles.section}>
                    <p className={styles.sectionEyebrow}>Simple by design</p>
                    <h2 className={styles.sectionTitle}>How DepMi works</h2>
                    <div className={styles.stepsGrid}>
                        <div className={styles.stepCard}>
                            <div className={styles.stepNumber}>1</div>
                            <div className={styles.stepIcon}>
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                                </svg>
                            </div>
                            <h3 className={styles.stepTitle}>Post what you need</h3>
                            <p className={styles.stepDesc}>
                                Can't find what you're looking for? Post a Demand — describe the item, set your budget, and let sellers come to you.
                            </p>
                        </div>
                        <div className={styles.stepCard}>
                            <div className={styles.stepNumber}>2</div>
                            <div className={styles.stepIcon}>
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="m14.5 12.5-8 8a2.12 2.12 0 0 1-3-3l8-8"/><path d="m16 7 1-5 1.37.68A3 3 0 0 0 19.7 3H21v1.3a3 3 0 0 0 .32 1.33L22 7l-5 1Z"/><path d="m11.5 12.5 2-2"/>
                                </svg>
                            </div>
                            <h3 className={styles.stepTitle}>Sellers place bids</h3>
                            <p className={styles.stepDesc}>
                                Store owners on DepMi see your request and bid on it. Compare prices, check seller reputation, pick the best offer.
                            </p>
                        </div>
                        <div className={styles.stepCard}>
                            <div className={styles.stepNumber}>3</div>
                            <div className={styles.stepIcon}>
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect width="20" height="14" x="2" y="5" rx="2"/><path d="M2 10h20"/>
                                </svg>
                            </div>
                            <h3 className={styles.stepTitle}>Pay safe, receive confident</h3>
                            <p className={styles.stepDesc}>
                                Your payment is held in Escrow — not released to the seller until you confirm the item arrived as described. Zero risk.
                            </p>
                        </div>
                    </div>
                </section>

                {/* ── For Buyers / For Sellers ── */}
                <section className={styles.splitSection}>
                    <div className={`${styles.splitCard} ${styles.splitCardBuyer}`}>
                        <div className={styles.splitIcon}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" x2="21" y1="6" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
                            </svg>
                        </div>
                        <h3 className={styles.splitTitle}>For Buyers</h3>
                        <ul className={styles.splitList}>
                            <li>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                                Browse thousands of local listings
                            </li>
                            <li>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                                Post a request — sellers find you
                            </li>
                            <li>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                                Compare bids before paying
                            </li>
                            <li>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                                Money held safe until delivery confirmed
                            </li>
                            <li>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                                Chat directly with sellers
                            </li>
                        </ul>
                        <button onClick={() => signIn('google')} className={styles.splitCta}>
                            Start Shopping
                        </button>
                    </div>

                    <div className={`${styles.splitCard} ${styles.splitCardSeller}`}>
                        <div className={styles.splitIcon}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                            </svg>
                        </div>
                        <h3 className={styles.splitTitle}>For Sellers</h3>
                        <ul className={styles.splitList}>
                            <li>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                                Open a free store in minutes
                            </li>
                            <li>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                                See open buyer requests by category
                            </li>
                            <li>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                                Bid on requests that match your stock
                            </li>
                            <li>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                                Build trust with Deps (reputation score)
                            </li>
                            <li>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                                Get paid via secure Escrow — no chargebacks
                            </li>
                        </ul>
                        <button onClick={() => signIn('google')} className={styles.splitCta}>
                            Open Your Store
                        </button>
                    </div>
                </section>

                {/* ── Escrow trust section ── */}
                <section className={styles.escrowSection}>
                    <div className={styles.escrowIcon}>
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        </svg>
                    </div>
                    <h2 className={styles.escrowTitle}>Your money, protected by Escrow</h2>
                    <p className={styles.escrowDesc}>
                        Unlike Instagram DMs or WhatsApp deals where scammers thrive, every
                        transaction on DepMi goes through Escrow. Your payment is locked until
                        you confirm delivery — the seller only gets paid when you're satisfied.
                        If something goes wrong, your money comes back.
                    </p>
                    <div className={styles.escrowSteps}>
                        <div className={styles.escrowStep}>
                            <span className={styles.escrowStepDot} />
                            <span>You pay → funds held in Escrow</span>
                        </div>
                        <div className={styles.escrowArrow}>→</div>
                        <div className={styles.escrowStep}>
                            <span className={styles.escrowStepDot} />
                            <span>Seller ships → you confirm receipt</span>
                        </div>
                        <div className={styles.escrowArrow}>→</div>
                        <div className={styles.escrowStep}>
                            <span className={styles.escrowStepDot} />
                            <span>Funds released to seller</span>
                        </div>
                    </div>
                </section>

                {/* ── Categories ── */}
                <section className={styles.section}>
                    <p className={styles.sectionEyebrow}>Find anything</p>
                    <h2 className={styles.sectionTitle}>What's on DepMi</h2>
                    <div className={styles.categoriesGrid}>
                        {CATEGORIES.map(cat => (
                            <div key={cat.label} className={styles.categoryChip}>
                                <span className={styles.categoryEmoji}>{cat.icon}</span>
                                <span>{cat.label}</span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ── Bottom CTA ── */}
                <section className={styles.bottomCta}>
                    <h2 className={styles.bottomCtaTitle}>Ready to buy or sell?</h2>
                    <p className={styles.bottomCtaDesc}>
                        Join {fmt(stats.users)}+ members already buying and building on DepMi.
                    </p>
                    <button onClick={() => signIn('google')} className={styles.googleBtn} style={{ maxWidth: 320, margin: '0 auto' }}>
                        <Image src="/google-icon.svg" alt="Google" width={20} height={20} />
                        Continue with Google
                    </button>
                </section>
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
