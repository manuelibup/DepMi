import type { Metadata } from 'next';
import Link from 'next/link';
import styles from '../legal.module.css';

export const metadata: Metadata = {
    title: 'About DepMi — Buy Here. Build Here. Grow Here.',
    description: 'DepMi is the social commerce platform built for African entrepreneurs. Learn about our mission, the Demand Engine, and the Deps trust system.',
};

export default function AboutPage() {
    return (
        <main className={styles.page}>
            <div className={styles.container}>
                <Link href="/" className={styles.back}>← Back to DepMi</Link>

                <h1 className={styles.title}>About DepMi</h1>
                <p className={styles.lead}>
                    DepMi (meaning <em>"Buy Here"</em> in Ibibio) is a social commerce platform built for African entrepreneurs — where buyers post what they need, sellers compete to fulfil it, and every transaction builds trust.
                </p>

                <h2 className={styles.h2}>Our Mission</h2>
                <p>
                    Africa's commerce happens through trust networks — WhatsApp groups, Instagram DMs, and market stalls built on reputation. DepMi digitalises that trust at scale. We bridge the gap between social discovery (Instagram, Facebook) and structured commerce (Shopify, Jumia) so that every small business owner can sell like a brand and every buyer can shop with confidence.
                </p>

                <h2 className={styles.h2}>The Demand Engine</h2>
                <p>
                    Most marketplaces are built around supply. DepMi is built around demand. Buyers post what they want, their budget, and their location. Verified sellers bid to fulfil the request. The result: zero friction for buyers, guaranteed high-intent leads for sellers.
                </p>

                <h2 className={styles.h2}>Deps — Trust You Can See</h2>
                <p>
                    Every completed transaction earns Deps — a credibility score visible on every profile and store. Deps can't be bought, gamed, or faked. They're earned through real commerce. The more you sell, the more you're trusted. The more you buy, the more sellers want to work with you.
                </p>
                <p>
                    Dep Tiers: 🌱 Seedling → ⭐ Rising → 🔥 Trusted → 💎 Elite → 🏆 Legend.
                </p>

                <h2 className={styles.h2}>Secure Escrow</h2>
                <p>
                    Every order on DepMi is protected by escrow. Buyers pay, funds are held securely, and the seller only receives payment after the buyer confirms delivery. No more lost money, no more ghosted sellers.
                </p>

                <h2 className={styles.h2}>Built for Africa</h2>
                <p>
                    Based in Nigeria. Built for the continent. We support Naira payments via Flutterwave, local bank payouts, and a mobile-first experience designed for everyday Nigerian internet speeds and devices.
                </p>

                <h2 className={styles.h2}>Contact</h2>
                <p>
                    For partnership inquiries: <a href="mailto:hello@depmi.com">hello@depmi.com</a><br />
                    For support: <a href="mailto:support@depmi.com">support@depmi.com</a><br />
                    For press: <a href="mailto:press@depmi.com">press@depmi.com</a>
                </p>

                <div className={styles.footer}>
                    <Link href="/terms">Terms of Service</Link>
                    <Link href="/privacy">Privacy Policy</Link>
                    <Link href="/">Back to App</Link>
                </div>
            </div>
        </main>
    );
}
