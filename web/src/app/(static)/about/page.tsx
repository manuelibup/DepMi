import React from 'react';
import styles from '../static.module.css';

export default function AboutPage() {
    return (
        <div className={styles.section}>
            <h1 className={styles.title}>About DepMi</h1>
            <p className={styles.text}>
                DepMi is the social commerce platform reimagined for the African market.
                We believe in the power of social connections to drive commerce, and we're building
                the tools to make that possible, securely and efficiently.
            </p>
            <p className={styles.text}>
                Our mission is to empower entrepreneurs and consumers by providing a trusted
                environment for discovery, negotiation, and secure transactions through Escrow.
            </p>
        </div>
    );
}
