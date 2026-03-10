import React from 'react';
import styles from '../static.module.css';

export default function PrivacyPage() {
    return (
        <div className={styles.section}>
            <h1 className={styles.title}>Privacy Policy</h1>
            <p className={styles.text}>
                Your privacy is important to us.
            </p>
            <div className={styles.section}>
                <h2 className={styles.subtitle}>1. Information We Collect</h2>
                <p className={styles.text}>
                    We collect information to provide better services to all our users.
                    This includes information you give us (like your name and email address)
                    and information we get from your use of our services (like device information
                    and location).
                </p>
            </div>
            <div className={styles.section}>
                <h2 className={styles.subtitle}>2. How We Use Information</h2>
                <p className={styles.text}>
                    We use the information we collect to provide, maintain, protect and improve our
                    services, to develop new ones, and to protect DepMi and our users.
                </p>
            </div>
            <div className={styles.section}>
                <h2 className={styles.subtitle}>3. Information Security</h2>
                <p className={styles.text}>
                    We work hard to protect DepMi and our users from unauthorized access to or
                    unauthorized alteration, disclosure or destruction of information we hold.
                </p>
            </div>
        </div>
    );
}
