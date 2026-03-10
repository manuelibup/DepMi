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
                <h2 className={styles.subtitle}>Contact Support</h2>
                <p className={styles.text}>
                    Still have questions? Reach out to our support team at support@depmi.com.
                </p>
            </div>
        </div>
    );
}
