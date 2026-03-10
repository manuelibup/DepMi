import React from 'react';
import styles from '../static.module.css';

export default function TermsPage() {
    return (
        <div className={styles.section}>
            <h1 className={styles.title}>Terms of Service</h1>
            <p className={styles.text}>
                Welcome to DepMi. By using our services, you agree to these terms.
                Please read them carefully.
            </p>
            <div className={styles.section}>
                <h2 className={styles.subtitle}>1. Using our Services</h2>
                <p className={styles.text}>
                    You must follow any policies made available to you within the Services.
                    Don't misuse our Services. For example, don't interfere with our Services
                    or try to access them using a method other than the interface and the
                    instructions that we provide.
                </p>
            </div>
            <div className={styles.section}>
                <h2 className={styles.subtitle}>2. Your Content</h2>
                <p className={styles.text}>
                    Some of our Services allow you to upload, submit, store, send or receive content.
                    You retain ownership of any intellectual property rights that you hold in that content.
                    In short, what belongs to you stays yours.
                </p>
            </div>
            <div className={styles.section}>
                <h2 className={styles.subtitle}>3. Escrow and Payments</h2>
                <p className={styles.text}>
                    DepMi acts as a secure intermediary for transactions.
                    Payments are held in escrow until terms are fulfilled by both the buyer
                    and the seller.
                </p>
            </div>
        </div>
    );
}
