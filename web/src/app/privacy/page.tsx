import type { Metadata } from 'next';
import Link from 'next/link';
import styles from '../legal.module.css';

export const metadata: Metadata = {
    title: 'Privacy Policy — DepMi',
    description: 'How DepMi collects, uses, and protects your personal data.',
};

export default function PrivacyPage() {
    const updated = 'March 19, 2026';
    return (
        <main className={styles.page}>
            <div className={styles.container}>
                <Link href="/" className={styles.back}>← Back to DepMi</Link>

                <h1 className={styles.title}>Privacy Policy</h1>
                <p className={styles.meta}>Last updated: {updated}</p>

                <p className={styles.lead}>
                    DepMi Limited (&quot;DepMi&quot;) is committed to protecting your privacy. This policy explains what data we collect, how we use it, and your rights.
                </p>

                <h2 className={styles.h2}>1. Data We Collect</h2>
                <p><strong>Account data:</strong> Name, email address, phone number, date of birth, profile photo, and username when you register.</p>
                <p><strong>Identity verification data:</strong> BVN and NIN reference tokens (we store Dojah verification reference IDs only — we never store raw BVN or NIN numbers).</p>
                <p><strong>Transaction data:</strong> Order details, payment references, escrow records, and Dep transaction history.</p>
                <p><strong>Behavioural data:</strong> In-app interactions including products viewed, feed impressions, searches made, items liked or saved, and bids placed — collected to improve the platform and personalise your experience. We collect a session identifier stored in your browser&apos;s local storage to group interactions anonymously. We do not use third-party tracking tools.</p>
                <p><strong>Device data:</strong> IP address, browser type, and device identifiers for security and fraud prevention.</p>

                <h2 className={styles.h2}>2. Legal Basis for Processing</h2>
                <p>We process your data under the following lawful bases as defined by the Nigeria Data Protection Act 2023 (NDPA):</p>
                <ul className={styles.list}>
                    <li><strong>Contract performance</strong> — processing necessary to operate your account, process orders, and fulfil transactions</li>
                    <li><strong>Legitimate interest</strong> — first-party behavioural analytics to improve the product, detect fraud, and personalise your feed. You can opt out at any time in Settings → Privacy</li>
                    <li><strong>Legal obligation</strong> — compliance with Nigerian financial and tax regulations</li>
                    <li><strong>Consent</strong> — transactional communications (you can withdraw consent at any time)</li>
                </ul>

                <h2 className={styles.h2}>3. How We Use Your Data</h2>
                <ul className={styles.list}>
                    <li>To operate the platform and process transactions securely</li>
                    <li>To verify your identity and prevent fraud</li>
                    <li>To send transactional notifications (order updates, bid alerts, messages)</li>
                    <li>To personalise your feed and recommendations</li>
                    <li>To comply with Nigerian financial regulations (CBN, FIRS)</li>
                    <li>To improve platform performance and fix bugs</li>
                </ul>

                <h2 className={styles.h2}>4. Data Sharing</h2>
                <p>We share your data only with:</p>
                <ul className={styles.list}>
                    <li><strong>Flutterwave</strong> — payment processing (bound by their privacy policy)</li>
                    <li><strong>Dojah / Smile ID</strong> — identity verification (KYC providers)</li>
                    <li><strong>Resend</strong> — transactional email delivery</li>
                    <li><strong>Termii</strong> — SMS OTP delivery</li>
                    <li><strong>Cloudinary</strong> — image storage and delivery</li>
                    <li><strong>Neon / Vercel</strong> — infrastructure hosting</li>
                </ul>
                <p>We never sell your data to third parties for advertising.</p>

                <h2 className={styles.h2}>5. Data Retention</h2>
                <p>We retain account data for as long as your account is active. Transaction records are retained for 7 years as required by Nigerian financial regulations. Raw behavioural event data is automatically purged after 90 days — only aggregated summaries are kept long-term. You may request deletion of non-transaction data at any time.</p>

                <h2 className={styles.h2}>6. Security</h2>
                <p>All data is encrypted in transit (TLS). Passwords are hashed with bcrypt (12+ salt rounds). Payment credentials are never stored — only tokenised references from Flutterwave. We conduct regular security audits and rate-limit sensitive endpoints.</p>

                <h2 className={styles.h2}>7. Your Rights</h2>
                <p>You have the right to:</p>
                <ul className={styles.list}>
                    <li>Access the personal data we hold about you</li>
                    <li>Request correction of inaccurate data</li>
                    <li>Request deletion of your account and associated data</li>
                    <li>Opt out of behavioural analytics at any time via <strong>Settings → Privacy</strong></li>
                    <li>Opt out of non-transactional communications</li>
                    <li>Receive a copy of your data in a portable format</li>
                </ul>
                <p>To exercise these rights, email <a href="mailto:privacy@depmi.com">privacy@depmi.com</a>.</p>

                <h2 className={styles.h2}>8. Cookies &amp; Local Storage</h2>
                <p>DepMi uses session cookies for authentication and local storage for user preferences and an anonymous session identifier used in behavioural analytics. We do not use third-party advertising cookies or tracking pixels.</p>

                <h2 className={styles.h2}>9. Children</h2>
                <p>DepMi is not intended for users under 18. We do not knowingly collect data from minors. If you believe a minor has registered, contact us at <a href="mailto:privacy@depmi.com">privacy@depmi.com</a>.</p>

                <h2 className={styles.h2}>10. Changes</h2>
                <p>We may update this policy. Material changes will be communicated by email or in-app notification. Continued use after changes constitutes acceptance.</p>

                <h2 className={styles.h2}>11. Contact</h2>
                <p>Data protection queries: <a href="mailto:privacy@depmi.com">privacy@depmi.com</a></p>

                <div className={styles.footer}>
                    <Link href="/about">About</Link>
                    <Link href="/terms">Terms of Service</Link>
                    <Link href="/">Back to App</Link>
                </div>
            </div>
        </main>
    );
}
