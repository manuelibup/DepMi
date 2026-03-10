import React from 'react';
import Link from 'next/link';
import styles from './static.module.css';

export default function StaticLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <Link href="/" className={styles.logo}>DepMi</Link>
            </header>
            <main className={styles.main}>
                {children}
            </main>
            <footer className={styles.footer}>
                <p>© 2026 DepMi, Inc.</p>
            </footer>
        </div>
    );
}
