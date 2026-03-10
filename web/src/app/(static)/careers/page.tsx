import React from 'react';
import styles from '../static.module.css';

export default function CareersPage() {
    return (
        <div className={styles.section}>
            <h1 className={styles.title}>Careers at DepMi</h1>
            <p className={styles.text}>
                We're on a mission to reshape African commerce.
                While we are not currently hiring for any open positions, we're always interested
                in hearing from talented, passionate individuals who believe in our mission.
            </p>
            <p className={styles.text}>
                Check back later for updates on open roles!
            </p>
        </div>
    );
}
