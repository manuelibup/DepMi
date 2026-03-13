import React from 'react';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import styles from './page.module.css';
import Link from 'next/link';
import Image from 'next/image';
import ClientNotifyButton from './ClientNotifyButton';
import ClientRequestButton from './ClientRequestButton';

import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import EmptyState from '@/components/EmptyState';
import ProductCard from '@/components/ProductCard';
import DemandCard from '@/components/DemandCard';

const CATEGORIES = ['All', 'FASHION', 'GADGETS', 'BEAUTY', 'FOOD', 'FURNITURE', 'VEHICLES', 'SERVICES', 'OTHER'];
const COLORS = ['#1A1D1F', '#0984E3', '#00B894', '#D63031', '#6C5CE7', '#E17055'];

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string, category?: string }> }) {
    const sp = await searchParams;
    const q = sp.q || '';
    const cat = sp.category;

    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

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

    // Products with all fields needed for ProductCard
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
            store: { select: { name: true, slug: true, depCount: true, depTier: true, ownerId: true, owner: { select: { username: true } } } },
            _count: { select: { likes: true, saves: true, comments: true } },
            ...(userId ? {
                likes: { where: { userId }, select: { id: true } },
                saves: { where: { userId }, select: { id: true } }
            } : {})
        }
    });

    // Demands matching query
    const demands = await prisma.demand.findMany({
        where: {
            isActive: true,
            ...(q ? {
                OR: [
                    { text: { contains: q, mode: 'insensitive' } },
                ]
            } : {}),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ...(cat && cat !== 'All' ? { category: cat as any } : {})
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
            user: { select: { displayName: true, username: true, avatarUrl: true } },
            _count: { select: { bids: true, comments: true, likes: true } },
            images: { orderBy: { order: 'asc' }, take: 3, select: { url: true } },
            ...(userId ? {
                likes: { where: { userId }, select: { id: true } },
                saves: { where: { userId }, select: { id: true } }
            } : {})
        }
    });

    // Build unified feed interleaved by createdAt
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const productItems = (products as any[]).map(p => ({ type: 'product' as const, data: p, createdAt: p.createdAt }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const demandItems = (demands as any[]).map(d => ({ type: 'demand' as const, data: d, createdAt: d.createdAt }));
    const feed = [...productItems, ...demandItems].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const isEmpty = products.length === 0 && demands.length === 0;

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
                    <input type="search" name="q" defaultValue={q} className={styles.searchInput} placeholder="Search products, stores, requests..." autoFocus={!q} />
                </form>
            </div>

            {/* Categories */}
            <section className={styles.section} style={{ paddingTop: '8px' }}>
                <div className={styles.categoriesScroll}>
                    {CATEGORIES.map((c) => {
                        const params = new URLSearchParams();
                        if (q) params.set('q', q);
                        params.set('category', c);
                        const isActive = c === 'All' ? (!cat || cat === 'All') : cat === c;
                        return (
                            <Link key={c} href={`/search?${params.toString()}`} className={`${styles.categoryPill} ${isActive ? styles.active : ''}`}>
                                {c}
                            </Link>
                        );
                    })}
                </div>
            </section>

            {/* People Results */}
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
                                    <path d="m9 18 6-6-6-6" />
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
                            const colorIndex = (store.name.length + i) % COLORS.length;
                            return (
                                <Link href={`/store/${store.slug}`} key={store.id} className={styles.storeCard}>
                                    <div className={styles.storeLogo} style={{ background: store.logoUrl ? 'transparent' : COLORS[colorIndex] }}>
                                        {store.logoUrl ? (
                                            <Image src={store.logoUrl} alt={store.name} width={64} height={64} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <span style={{ color: '#fff' }}>{store.name.charAt(0).toUpperCase()}</span>
                                        )}
                                    </div>
                                    <span className={styles.storeName}>{store.name}</span>
                                    <span className={styles.storeDeps}>{store.depCount} Deps</span>
                                </Link>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* Unified feed — products + demands */}
            <section className={styles.section}>
                <div className={styles.sectionTitle}>
                    <span>{q ? `Results for "${q}"` : 'Latest Listings'}</span>
                    {!isEmpty && (
                        <span style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                            {products.length} products · {demands.length} requests
                        </span>
                    )}
                </div>

                {isEmpty ? (
                    <EmptyState
                        title={q ? `Nothing found for "${q}"` : 'No listings yet'}
                        description="Don't give up! You can request this item directly from vendors or get notified when it drops."
                        icon={<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>}
                    >
                        <ClientRequestButton searchQuery={q} />
                        <ClientNotifyButton searchQuery={q} />
                    </EmptyState>
                ) : (
                    <div className={styles.feedList}>
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {feed.map((item, index) => {
                            if (item.type === 'product') {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                const p = item.data as any;
                                const colorIndex = p.store.name.length % COLORS.length;
                                const pData = {
                                    store: p.store.name,
                                    storeSlug: p.store.slug,
                                    storeInitial: p.store.name.charAt(0).toUpperCase(),
                                    storeColor: COLORS[colorIndex],
                                    deps: p.store.depCount,
                                    depTier: p.store.depTier.toLowerCase(),
                                    title: p.title,
                                    price: `₦${Number(p.price).toLocaleString()}`,
                                    location: 'Nationwide',
                                    image: p.images && p.images.length > 0 ? p.images[0].url : '',
                                    viewers: p.viewCount,
                                    id: p.id,
                                    ownerId: p.store.ownerId,
                                    ownerUsername: p.store.owner.username,
                                    likeCount: p._count.likes,
                                    saveCount: p._count.saves,
                                    commentCount: p._count.comments,
                                    stock: p.stock,
                                    inStock: p.inStock,
                                    ...(userId ? {
                                        isLiked: p.likes && p.likes.length > 0,
                                        isSaved: p.saves && p.saves.length > 0,
                                    } : {})
                                };
                                return <ProductCard key={`p-${p.id}`} data={pData} index={index} />;
                            } else {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                const d = item.data as any;
                                const dData = {
                                    id: d.id,
                                    username: d.user.username ?? undefined,
                                    user: d.user.displayName,
                                    initials: (d.user.displayName || d.user.username || '??').substring(0, 2).toUpperCase(),
                                    avatarUrl: d.user.avatarUrl ?? null,
                                    timeAgo: new Date(d.createdAt).toLocaleDateString(),
                                    text: d.text || '',
                                    budget: `₦${Number(d.budget).toLocaleString()}`,
                                    budgetMin: d.budgetMin ? `₦${Number(d.budgetMin).toLocaleString()}` : null,
                                    bids: d._count.bids,
                                    commentCount: d._count.comments,
                                    likeCount: d._count.likes,
                                    viewCount: d.viewCount,
                                    isLiked: userId ? (d.likes && d.likes.length > 0) : false,
                                    isSaved: userId ? (d.saves && d.saves.length > 0) : false,
                                    location: d.location ?? null,
                                    images: d.images.map((img: { url: string }) => img.url),
                                };
                                return <DemandCard key={`d-${d.id}`} data={dData} index={index} />;
                            }
                        })}
                    </div>
                )}
            </section>

            <BottomNav />
        </main>
    );
}
