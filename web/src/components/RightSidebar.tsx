import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { prisma } from '@/lib/prisma';
import { unstable_cache } from 'next/cache';
import styles from './RightSidebar.module.css';

// Cache for 5 minutes — sidebar data doesn't need to be real-time
const getOpenDemands = unstable_cache(
    async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (prisma.demand as any).findMany({
            where: { isActive: true },
            orderBy: [{ createdAt: 'desc' }],
            take: 5,
            select: {
                id: true,
                text: true,
                budget: true,
                budgetMin: true,
                location: true,
                category: true,
                user: { select: { displayName: true, avatarUrl: true } },
                _count: { select: { bids: true } },
            },
        });
    },
    ['sidebar-demands'],
    { revalidate: 300 },
);

const getPlatformStats = unstable_cache(
    async () => {
        const [users, stores, products] = await Promise.all([
            prisma.user.count(),
            prisma.store.count({ where: { isActive: true } }),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (prisma.product as any).count({ where: { stock: { gt: 0 } } }),
        ]);
        return { users, stores, products };
    },
    ['platform-stats'],
    { revalidate: 300 },
);

const getSuggestedStores = unstable_cache(
    async () => {
        return prisma.store.findMany({
            where: { isActive: true },
            orderBy: { depCount: 'desc' },
            take: 4,
            select: { id: true, name: true, slug: true, logoUrl: true, depCount: true, depTier: true },
        });
    },
    ['sidebar-top-stores'],
    { revalidate: 300 },
);

const TIER_COLOR: Record<string, string> = {
    SEEDLING: '#aaa',
    RISING: '#FFD700',
    TRUSTED: '#FF6B35',
    ELITE: 'var(--primary)',
    LEGEND: '#A855F7',
};

export default async function RightSidebar() {
    const [demands, stores, stats] = await Promise.all([getOpenDemands(), getSuggestedStores(), getPlatformStats()]);

    return (
        <aside className={styles.sidebar}>
            {/* Platform Stats */}
            <section className={styles.section}>
                <h2 className={styles.sectionTitle} style={{ marginBottom: 12 }}>DepMi Today</h2>
                <div className={styles.statsGrid}>
                    <div className={styles.statBox}>
                        <span className={styles.statValue}>{stats.users.toLocaleString()}</span>
                        <span className={styles.statLabel}>Members</span>
                    </div>
                    <div className={styles.statBox}>
                        <span className={styles.statValue}>{stats.stores.toLocaleString()}</span>
                        <span className={styles.statLabel}>Stores</span>
                    </div>
                    <div className={styles.statBox}>
                        <span className={styles.statValue}>{stats.products.toLocaleString()}</span>
                        <span className={styles.statLabel}>Listings</span>
                    </div>
                </div>
            </section>

            {/* Open Demands */}
            <section className={styles.section}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>Open Requests</h2>
                    <Link href="/requests" className={styles.seeAll}>See all</Link>
                </div>

                {demands.length === 0 ? (
                    <p className={styles.empty}>No open requests right now.</p>
                ) : (
                    <div className={styles.demandList}>
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {demands.map((d: any) => (
                            <Link key={d.id} href={`/requests/${d.id}`} className={styles.demandCard}>
                                <div className={styles.demandTop}>
                                    <div className={styles.demandAvatar}>
                                        {d.user.avatarUrl
                                            ? <Image src={d.user.avatarUrl} alt="" width={28} height={28} style={{ objectFit: 'cover', borderRadius: '50%' }} />
                                            : <span className={styles.demandAvatarInitial}>{(d.user.displayName || '?').charAt(0).toUpperCase()}</span>
                                        }
                                    </div>
                                    <div className={styles.demandMeta}>
                                        <p className={styles.demandUser}>{d.user.displayName}</p>
                                        <p className={styles.demandCat}>{d.category}</p>
                                    </div>
                                    <span className={styles.bidCount}>{d._count.bids} bid{d._count.bids !== 1 ? 's' : ''}</span>
                                </div>
                                <p className={styles.demandText}>{d.text}</p>
                                <div className={styles.demandFooter}>
                                    <span className={styles.demandBudget}>
                                        ₦{Number(d.budgetMin || d.budget).toLocaleString()}
                                        {d.budgetMin && <> – ₦{Number(d.budget).toLocaleString()}</>}
                                    </span>
                                    {d.location && <span className={styles.demandLoc}>{d.location}</span>}
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </section>

            {/* Suggested Stores */}
            <section className={styles.section}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>Top Sellers</h2>
                    <Link href="/search" className={styles.seeAll}>Explore</Link>
                </div>

                <div className={styles.storeList}>
                    {stores.map(s => (
                        <Link key={s.id} href={`/store/${s.slug}`} className={styles.storeRow}>
                            <div className={styles.storeLogo}>
                                {s.logoUrl
                                    ? <Image src={s.logoUrl} alt={s.name} width={36} height={36} style={{ objectFit: 'cover', borderRadius: '50%' }} />
                                    : <span className={styles.storeLogoInitial}>{s.name.charAt(0).toUpperCase()}</span>
                                }
                            </div>
                            <div className={styles.storeInfo}>
                                <p className={styles.storeName}>{s.name}</p>
                                <p className={styles.storeDeps} style={{ color: TIER_COLOR[s.depTier] ?? '#aaa' }}>
                                    {s.depCount} Deps · {s.depTier.charAt(0) + s.depTier.slice(1).toLowerCase()}
                                </p>
                            </div>
                            <span className={styles.visitBtn}>Visit</span>
                        </Link>
                    ))}
                </div>
            </section>

            <p className={styles.footer}>
                <Link href="/about">About</Link> · <Link href="/terms">Terms</Link> · <Link href="/privacy">Privacy</Link>
                <br />© {new Date().getFullYear()} DepMi
            </p>
        </aside>
    );
}
