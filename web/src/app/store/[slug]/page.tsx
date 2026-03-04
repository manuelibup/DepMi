import React from 'react';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import styles from './page.module.css';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import EmptyState from '@/components/EmptyState';

interface StorePageProps {
    params: Promise<{
        slug: string;
    }>;
}

// Map DepTier to label and emoji (matches agent.md spec)
const TIER_META = {
    SEEDLING: { label: '🌱 Seedling', style: '' },
    RISING: { label: '⭐ Rising', style: '' },
    TRUSTED: { label: '🔥 Trusted', style: '' },
    ELITE: { label: '💎 Elite', style: '' },
    LEGEND: { label: '🏆 Legend', style: styles.tierLegend },
};

export default async function StorefrontPage({ params }: StorePageProps) {
    const { slug } = await params;
    const session = await getServerSession(authOptions);

    const store = await prisma.store.findUnique({
        where: { slug },
        include: {
            owner: {
                select: { kycTier: true }
            },
            products: {
                where: { inStock: true },
                orderBy: { createdAt: 'desc' },
                include: { images: true }
            }
        }
    });

    if (!store) {
        notFound();
    }

    const tier = TIER_META[store.depTier as keyof typeof TIER_META] || TIER_META.SEEDLING;

    // Badging Logic
    const isPremiumCertified = store.owner.kycTier === 'TIER_3';
    const isBvnVerified = store.owner.kycTier === 'TIER_2' || store.owner.kycTier === 'BUSINESS' || isPremiumCertified; // Fallback

    return (
        <main className={styles.container}>
            <header className={styles.cover}>
                {store.bannerUrl && (
                    <img src={store.bannerUrl} alt={`${store.name} banner`} className={styles.bannerImage} />
                )}
                <Link href="/" className={styles.backLink} style={{ position: 'absolute', top: 16, left: 16, color: '#fff', background: 'rgba(0,0,0,0.2)', padding: '6px', borderRadius: '50%', display: 'flex' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m15 18-6-6 6-6" />
                    </svg>
                </Link>
            </header>

            <section className={styles.profileContent}>
                <div className={styles.logo}>
                    {store.logoUrl ? (
                        <img src={store.logoUrl} alt={store.name} className={styles.logoImage} />
                    ) : (
                        store.name.charAt(0).toUpperCase()
                    )}
                </div>

                <div className={styles.info}>
                    <h1 className={styles.storeName}>
                        {store.name}
                        {isPremiumCertified ? (
                            <span className={styles.certifiedBadge} title="DepMi Certified (CAC Backed)">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2l2.67 2.67L18.41 4l.59 3.76L22 9.5l-2.07 3.14L22 15.78l-3.03 1.74-.59 3.76-3.74-.67L12 23l-2.67-2.67-3.74.67-.59-3.76L2 15.78l2.07-3.14L2 9.5l3.03-1.74.59-3.76 3.74.67L12 2zm0 18.06c4.41 0 8-3.59 8-8s-3.59-8-8-8-8 3.59-8 8 3.59 8 8 8zm-1.88-5.74L7.4 11.61l1.41-1.41 1.31 1.31 4.88-4.88 1.41 1.41-6.29 6.28z" />
                                </svg>
                            </span>
                        ) : isBvnVerified ? (
                            <span className={styles.verifiedBadge} title="BVN Verified">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                                </svg>
                            </span>
                        ) : null}
                    </h1>
                    <p className={styles.slug}>@{store.slug}</p>

                    {store.location && (
                        <div className={styles.location}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                                <circle cx="12" cy="10" r="3" />
                            </svg>
                            {store.location}
                        </div>
                    )}

                    {store.description && (
                        <p className={styles.description}>{store.description}</p>
                    )}
                </div>

                <div className={styles.trustSection}>
                    <div className={styles.depCard}>
                        <span className={styles.depLabel}>Seller Trust Score</span>
                        <span className={styles.depValue}>{store.depCount}</span>
                        <div className={`${styles.tierBadge} ${tier.style}`}>
                            {tier.label}
                        </div>
                    </div>
                </div>
            </section>

            <section className={styles.productsSection}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h2 className={styles.sectionTitle} style={{ marginBottom: 0 }}>Products</h2>
                    {session?.user?.id === store.ownerId && (
                        <Link href={`/store/${store.slug}/products/new`} className={styles.addProductBtn}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            Add Product
                        </Link>
                    )}
                </div>

                {store.products.length === 0 ? (
                    <div style={{ marginTop: '24px' }}>
                        <EmptyState 
                            title="No products listed yet"
                            description="This vendor hasn't added any products to their store."
                        />
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                        {store.products.map(product => (
                            <Link href={`/p/${product.id}`} key={product.id} style={{ display: 'flex', flexDirection: 'column', background: 'var(--card-bg)', borderRadius: 'var(--radius-md)', overflow: 'hidden', textDecoration: 'none', border: '1px solid var(--card-border)' }}>
                                <div style={{ width: '100%', aspectRatio: '1/1', backgroundColor: 'var(--bg-elevated)', position: 'relative' }}>
                                    {product.images && product.images.length > 0 ? (
                                        <img src={product.images[0].url} alt={product.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', color: 'var(--text-muted)' }}>
                                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                                <rect width="18" height="18" x="3" y="3" rx="2" />
                                                <circle cx="9" cy="9" r="2" />
                                                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                                            </svg>
                                        </div>
                                    )}
                                </div>
                                <div style={{ padding: '12px' }}>
                                    <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', margin: '0 0 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {product.title}
                                    </h3>
                                    <p style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary)', margin: 0 }}>
                                        ₦{Number(product.price).toLocaleString()}
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </section>
        </main>
    );
}
