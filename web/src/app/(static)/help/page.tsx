import React from 'react';
import styles from '../static.module.css';

export default function HelpPage() {
    return (
        <div className={styles.section}>
            <h1 className={styles.title}>Help Center</h1>
            <p className={styles.text}>
                We're here to help you get the most out of DepMi.
            </p>

            <div className={styles.section}>
                <h2 className={styles.subtitle}>Frequently Asked Questions</h2>
                <div className={styles.section}>
                    <h3 className={styles.subtitle}>How does Escrow work?</h3>
                    <p className={styles.text}>
                        When you buy an item, your payment is held securely by DepMi.
                        We only release the funds to the seller once you confirm that you've
                        received the item and everything is as described.
                    </p>
                </div>
                <div className={styles.section}>
                    <h3 className={styles.subtitle}>How do I post a request?</h3>
                    <p className={styles.text}>
                        You can post a request by clicking the "Create" button in the sidebar
                        and selecting "Post a Request". Describe what you're looking for,
                        set your budget, and sellers will come to you!
                    </p>
                </div>
            </div>

            <div className={styles.section}>
                <h2 className={styles.subtitle}>Community Guidelines</h2>
                <p className={styles.text}>
                    DepMi is a safe marketplace. To protect buyers and sellers, the following
                    are <strong>not allowed</strong> in posts, requests, or comments:
                </p>

                <div className={styles.section}>
                    <h3 className={styles.subtitle}>❌ Off-platform contact sharing</h3>
                    <p className={styles.text}>
                        Do <strong>not</strong> share phone numbers, WhatsApp numbers, Telegram handles,
                        Instagram/TikTok/Snapchat usernames, or email addresses. All communication
                        between buyers and sellers must happen through DepMi Messages to ensure
                        your transaction is protected by escrow.
                    </p>
                    <p className={styles.text}>
                        <strong>Examples of what's blocked:</strong> sharing a phone number like
                        "08012345678", "wa.me/…", "my IG is @…", "contact me on WhatsApp", "DM me on
                        TikTok", your email address, and similar.
                    </p>
                    <p className={styles.text}>
                        <strong>What's fine:</strong> "check your DM", "I sent you a message on DepMi",
                        "DM me your order details" — these refer to DepMi's own messaging system and
                        are perfectly allowed.
                    </p>
                </div>

                <div className={styles.section}>
                    <h3 className={styles.subtitle}>❌ External links</h3>
                    <p className={styles.text}>
                        External URLs (links to other websites) are not allowed in posts, requests,
                        or comments. If you believe a specific link should be permitted on DepMi
                        (e.g., a verified resource or trusted partner), you can submit it for review
                        at <a href="/links" style={{ color: 'var(--primary)' }}>depmi.com/links</a>.
                        Approved links may be posted freely; unapproved links will result in a strike.
                    </p>
                </div>

                <div className={styles.section}>
                    <h3 className={styles.subtitle}>⚠️ Strikes and suspensions</h3>
                    <p className={styles.text}>
                        Every violation earns a <strong>strike</strong>. You'll receive a notification
                        each time. At <strong>5 strikes</strong> your account will be automatically
                        suspended. If you believe a strike was issued in error, contact us at{' '}
                        <a href="mailto:support@depmi.com" style={{ color: 'var(--primary)' }}>
                            support@depmi.com
                        </a>{' '}
                        to appeal.
                    </p>
                </div>
            </div>

            <div className={styles.section}>
                <h2 className={styles.subtitle}>Contact Support</h2>
                <p className={styles.text}>
                    Still have questions? Reach out to our support team at{' '}
                    <a href="mailto:support@depmi.com" style={{ color: 'var(--primary)' }}>
                        support@depmi.com
                    </a>.
                </p>
            </div>
        </div>
    );
}
