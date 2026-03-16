'use client';

import Link from 'next/link';
import styles from './SellerChecklist.module.css';

interface Step {
    label: string;
    description: string;
    href: string;
    cta: string;
    icon: React.ReactNode;
}

export default function SellerChecklist({ storeSlug }: { storeSlug: string }) {
    const steps: Step[] = [
        {
            label: 'Add your first product',
            description: 'List something to sell — photos, price, and description.',
            href: `/store/${storeSlug}/products/new`,
            cta: 'Add Product',
            icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="18" x="3" y="3" rx="2" />
                    <path d="M12 8v8M8 12h8" />
                </svg>
            ),
        },
        {
            label: 'Import products in bulk',
            description: 'Use AI or ISBN to import a catalogue fast.',
            href: `/store/${storeSlug}/products/import`,
            cta: 'Import',
            icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a10 10 0 1 0 10 10" />
                    <path d="m22 2-10 10" />
                    <path d="m17 2 5 5-5 5" />
                </svg>
            ),
        },
        {
            label: 'Set up payouts',
            description: 'Add your bank account so we know where to send your earnings.',
            href: `/store/${storeSlug}/settings`,
            cta: 'Settings',
            icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="14" x="2" y="5" rx="2" />
                    <path d="M2 10h20" />
                </svg>
            ),
        },
        {
            label: 'Share your store',
            description: 'Copy your store link and post it on WhatsApp, Instagram, or Twitter.',
            href: `/store/${storeSlug}`,
            cta: 'View Store',
            icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="18" cy="5" r="3" />
                    <circle cx="6" cy="12" r="3" />
                    <circle cx="18" cy="19" r="3" />
                    <path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98" />
                </svg>
            ),
        },
    ];

    return (
        <div className={styles.wrap}>
            <div className={styles.header}>
                <span className={styles.badge}>Store created ✓</span>
                <h2 className={styles.title}>Get your store ready</h2>
                <p className={styles.sub}>Complete these steps to start making sales.</p>
            </div>
            <div className={styles.steps}>
                {steps.map((step, i) => (
                    <div key={i} className={styles.step}>
                        <div className={styles.stepIcon}>{step.icon}</div>
                        <div className={styles.stepBody}>
                            <p className={styles.stepLabel}>{step.label}</p>
                            <p className={styles.stepDesc}>{step.description}</p>
                        </div>
                        <Link href={step.href} className={styles.stepCta}>
                            {step.cta}
                        </Link>
                    </div>
                ))}
            </div>
        </div>
    );
}
