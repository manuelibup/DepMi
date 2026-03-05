import React from 'react';
import { prisma } from '@/lib/prisma';
import styles from './page.module.css';
import Link from 'next/link';
import Image from 'next/image';
import ClientNotifyButton from './ClientNotifyButton';
import ClientRequestButton from './ClientRequestButton';

import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import EmptyState from '@/components/EmptyState';

const CATEGORIES = ['All', 'FASHION', 'GADGETS', 'BEAUTY', 'FOOD', 'FURNITURE', 'VEHICLES', 'SERVICES', 'OTHER'];

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string, category?: string }> }) {
    const sp = await searchParams;
    const q = sp.q || '';
    const cat = sp.category;

    // People search — only when query is present
    const people = q.length >= 2 ? await prisma.user.findMany({
        where: {
            OR: [
                { username: { contains: q, mode: 'insensitive' } },
                { displayName: { contains: q, mode: 'insensitive' } },
            ]
        },
        select: { username: true, displayName: true, depCount: true, depTier: true, avatarUrl: true },
        take: 5,
    }) : [];

    // Top 5 stores by Dep Count
    const topStores = await prisma.store.findMany({
        where: { isActive: true },
        orderBy: { depCount: 'desc' },
        take: 5,
        select: { id: true, name: true, slug: true, depCount: true, logoUrl: true }
    });

    // Recent Products with FTS emulation
    const products = await prisma.product.findMany({
        where: { 
            inStock: true,
            ...(q ? {
                OR: [
                    { title: { contains: q, mode: 'insensitive' } },
                    { description: { contains: q, mode: 'insensitive' } },
                    { store: { name: { contains: q, mode: 'insensitive' } } }
                ]
            } : {}),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ...(cat && cat !== 'All' ? { category: cat as any } : {})
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { 
            images: true,
            store: { select: { name: true } }
        }
    });

    return (
        <main className={styles.main}>
            <Header />

            {/* Sticky Search Bar */}
            <div className={styles.searchHeader}>
                <form action="/search" method="GET" className={styles.searchInputWrap}>
                    <svg className={styles.searchIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input type="search" name="q" defaultValue={q} className={styles.searchInput} placeholder="Search products, stores, demands..." />
                </form>
            </div>

            {/* Categories */}
            <section className={styles.section} style={{ paddingTop: '8px' }}>
                <div className={styles.categoriesScroll}>
                    {CATEGORIES.map((c) => {
                        const isActive = c === 'All' ? (!cat || cat === 'All') : cat === c;
                        return (
                            <Link key={c} href={`/search?category=${c}`} className={`${styles.categoryPill} ${isActive ? styles.active : ''}`}>
                                {c}
                            </Link>
                        );
                    })}
                </div>
            </section>

            {/* People Results — shown only when query matches users */}
            {people.length > 0 && (
                <section className={styles.section} style={{ paddingTop: 0 }}>
                    <div className={styles.sectionTitle}><span>People</span></div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {people.map(person => (
                            <Link
                                key={person.username}
                                href={`/u/${person.username}`}
                                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--card-bg)', borderBottom: '1px solid var(--card-border)', textDecoration: 'none' }}
                            >
                                <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'var(--bg-elevated)', border: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                                    {person.avatarUrl
                                        ? <img src={person.avatarUrl} alt={person.displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        : <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--primary)' }}>{person.displayName.charAt(0).toUpperCase()}</span>
                                    }
                                </div>
                                <div style={{ flex: 1 }}>
                                    <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>{person.displayName}</p>
                                    <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>@{person.username} · {person.depCount} Deps</p>
                                </div>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                                    <path d="m9 18 6-6-6-6"/>
                                </svg>
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {/* Featured Stores Carousel */}
            {topStores.length > 0 && (
                <section className={styles.section} style={{ paddingTop: '0' }}>
                    <div className={styles.sectionTitle}>
                        <span>Featured Stores 🏆</span>
                    </div>
                    <div className={styles.featuredStores}>
                        {topStores.map((store, i) => {
                            const colors = ['#1A1D1F', '#0984E3', '#00B894', '#D63031', '#6C5CE7', '#E17055'];
                            const colorIndex = (store.name.length + i) % colors.length;

                            return (
                                <Link href={`/store/${store.slug}`} key={store.id} className={styles.storeCard}>
                                    <div className={styles.storeLogo} style={{ background: store.logoUrl ? 'transparent' : colors[colorIndex] }}>
                                        {store.logoUrl ? (
                                            <Image src={store.logoUrl} alt={store.name} width={64} height={64} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <span style={{ color: '#fff' }}>{store.name.charAt(0).toUpperCase()}</span>
                                        )}
                                    </div>
                                    <span className={styles.storeName}>{store.name}</span>
                                    <span className={styles.storeDeps}>{store.depCount} Deps</span>
                                </Link>
                            )
                        })}
                    </div>
                </section>
            )}

            {/* Organic Products Feed */}
            <section className={styles.section}>
                <div className={styles.sectionTitle}>
                    <span>Recent Finds 📦</span>
                </div>

                {products.length === 0 ? (
                    <EmptyState
                        title={q ? `No products match "${q}"` : 'No products found'}
                        description="Don't give up! You can request this item directly from vendors or get notified if it drops."
                        icon={<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>}
                    >
                        <ClientRequestButton searchQuery={q} />
                        <ClientNotifyButton searchQuery={q} />
                    </EmptyState>
                ) : (
                    <div className={styles.productsGrid}>
                        {products.map(product => (
                            <Link href={`/p/${product.id}`} key={product.id} style={{ display: 'flex', flexDirection: 'column', background: 'var(--card-bg)', borderRadius: 'var(--radius-md)', overflow: 'hidden', textDecoration: 'none', border: '1px solid var(--card-border)' }}>
                                <div style={{ width: '100%', aspectRatio: '1/1', backgroundColor: 'var(--bg-elevated)', position: 'relative' }}>
                                    {product.images && product.images.length > 0 ? (
                                        <Image src={product.images[0].url} alt={product.title} fill style={{ objectFit: 'cover' }} sizes="(max-width: 480px) 50vw, 33vw" />
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
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 4px', fontWeight: 600 }}>
                                        Sold by {product.store.name}
                                    </p>
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

            <BottomNav />
        </main>
    );
}
