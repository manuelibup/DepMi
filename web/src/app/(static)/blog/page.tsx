import React from 'react';
import styles from '../static.module.css';

export default function BlogPage() {
    return (
        <div className={styles.section}>
            <h1 className={styles.title}>DepMi Blog</h1>
            <p className={styles.text}>
                Our official blog is currently in development.
                We'll be sharing updates, success stories, and insights on the future of
                commerce in Africa.
            </p>
            <p className={styles.text}>
                Stay tuned!
            </p>
        </div>
    );
}
