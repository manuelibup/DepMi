import type { Metadata } from 'next';
import Link from 'next/link';
import styles from '../legal.module.css';

export const metadata: Metadata = {
    title: 'Terms of Service — DepMi',
    description: 'Read the DepMi Terms of Service. Understand your rights and responsibilities as a buyer or seller on the platform.',
};

export default function TermsPage() {
    const updated = 'March 16, 2026';
    return (
        <main className={styles.page}>
            <div className={styles.container}>
                <Link href="/" className={styles.back}>← Back to DepMi</Link>

                <h1 className={styles.title}>Terms of Service</h1>
                <p className={styles.meta}>Last updated: {updated}</p>

                <p className={styles.lead}>
                    By using DepMi (&quot;the Platform&quot;), you agree to these Terms. Please read them carefully. If you disagree, do not use the Platform.
                </p>

                <h2 className={styles.h2}>1. Who We Are</h2>
                <p>DepMi is operated by DepMi Limited, a company registered in Nigeria. References to &quot;DepMi,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot; refer to this entity.</p>

                <h2 className={styles.h2}>2. Eligibility</h2>
                <p>You must be at least 18 years old to use DepMi. By creating an account, you confirm that you meet this requirement and that all information you provide is accurate.</p>

                <h2 className={styles.h2}>3. Accounts</h2>
                <p>You are responsible for maintaining the confidentiality of your account credentials. You must notify us immediately at <a href="mailto:security@depmi.com">security@depmi.com</a> if you suspect unauthorised access.</p>

                <h2 className={styles.h2}>4. Buyer Responsibilities</h2>
                <p>Buyers agree to pay the full listed price, confirm delivery honestly once goods are received, and not abuse the dispute system. Funds held in escrow are released only upon genuine delivery confirmation.</p>

                <h2 className={styles.h2}>5. Seller Responsibilities</h2>
                <p>Sellers must accurately describe all products and services, fulfil orders within the agreed timeframe, and not engage in fraudulent listings. Store creation requires identity verification (BVN + NIN). Sellers who violate these terms may have their store suspended and pending payouts withheld pending investigation.</p>

                <h2 className={styles.h2}>6. Escrow &amp; Payments</h2>
                <p>All transactions are processed via Flutterwave. DepMi holds buyer funds in escrow and releases them to the seller after the buyer confirms receipt. DepMi charges a 5% platform fee on completed transactions, deducted from the seller payout. New stores may qualify for a 90-day fee waiver at DepMi&apos;s discretion.</p>

                <h2 className={styles.h2}>7. Prohibited Activities</h2>
                <p>You may not use DepMi to: sell counterfeit, illegal, or prohibited goods; harass, threaten, or defraud other users; manipulate the Deps system through fake transactions; scrape or reverse-engineer the platform; or engage in money laundering or other financial crimes.</p>

                <h2 className={styles.h2}>8. Disputes</h2>
                <p>Buyers may raise a dispute within 48 hours of marked delivery if goods were not received or were materially different from the listing. DepMi will review evidence from both parties and make a binding decision on escrow release. DepMi&apos;s dispute decisions are final.</p>

                <h2 className={styles.h2}>9. Intellectual Property</h2>
                <p>Content you post on DepMi (photos, descriptions, etc.) remains yours. By posting, you grant DepMi a non-exclusive licence to display that content on the platform and in marketing materials. DepMi&apos;s brand, logo, and platform code are our intellectual property — do not reproduce without permission.</p>

                <h2 className={styles.h2}>10. Limitation of Liability</h2>
                <p>DepMi is a marketplace facilitator. We do not manufacture, store, or inspect goods. To the maximum extent permitted by Nigerian law, DepMi is not liable for indirect, incidental, or consequential damages arising from transactions between users.</p>

                <h2 className={styles.h2}>11. Termination</h2>
                <p>We reserve the right to suspend or terminate accounts that violate these Terms. Users may delete their account at any time from Settings.</p>

                <h2 className={styles.h2}>12. Changes to These Terms</h2>
                <p>We may update these Terms from time to time. Continued use of the platform after changes constitutes acceptance. Material changes will be communicated by email or in-app notification.</p>

                <h2 className={styles.h2}>13. Governing Law</h2>
                <p>These Terms are governed by the laws of the Federal Republic of Nigeria. Disputes shall be resolved in Nigerian courts.</p>

                <h2 className={styles.h2}>14. Contact</h2>
                <p>Questions about these Terms? Email <a href="mailto:legal@depmi.com">legal@depmi.com</a>.</p>

                <div className={styles.footer}>
                    <Link href="/about">About</Link>
                    <Link href="/privacy">Privacy Policy</Link>
                    <Link href="/">Back to App</Link>
                </div>
            </div>
        </main>
    );
}
