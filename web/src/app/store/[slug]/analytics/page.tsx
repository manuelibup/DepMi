import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import styles from './Analytics.module.css';

export const dynamic = 'force-dynamic';

export default async function StoreAnalyticsPage({
    params,
    searchParams,
}: {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ period?: string }>;
}) {
    const [{ slug }, sp] = await Promise.all([params, searchParams]);
    const period = sp?.period === '7d' ? '7d' : sp?.period === '30d' ? '30d' : 'all';

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) redirect('/login');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const store = await (prisma.store as any).findUnique({
        where: { slug },
        select: {
            id: true,
            name: true,
            ownerId: true,
            depCount: true,
            depTier: true,
            reviewCount: true,
            rating: true,
            feeWaiverUntil: true,
        },
    });
    if (!store) notFound();
    if (store.ownerId !== session.user.id) redirect(`/store/${slug}`);

    // Date filter
    const now = new Date();
    const dateFrom =
        period === '7d' ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        : period === '30d' ? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        : null;
    const dateFilter = dateFrom ? { createdAt: { gte: dateFrom } } : {};

    const [
        totalViews,
        totalSaves,
        totalLikes,
        followerCount,
        productCount,
        orderStats,
        topByViews,
        topBySaves,
        recentOrders,
        storeVisitsAgg,
    ] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (prisma as any).productView.count({
            where: { product: { storeId: store.id }, ...dateFilter },
        }),
        prisma.savedProduct.count({
            where: { product: { storeId: store.id }, ...dateFilter },
        }),
        prisma.productLike.count({
            where: { product: { storeId: store.id }, ...dateFilter },
        }),
        prisma.storeFollow.count({
            where: { storeId: store.id },
        }),
        prisma.product.count({
            where: { storeId: store.id },
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (prisma.order as any).groupBy({
            by: ['status'],
            where: { sellerId: store.id, ...dateFilter },
            _count: { id: true },
            _sum: { totalAmount: true },
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (prisma.product as any).findMany({
            where: { storeId: store.id },
            orderBy: { viewCount: 'desc' },
            take: 5,
            select: {
                id: true,
                title: true,
                viewCount: true,
                price: true,
                images: { take: 1, select: { url: true } },
            },
        }),
        prisma.product.findMany({
            where: { storeId: store.id },
            orderBy: { saves: { _count: 'desc' } },
            take: 5,
            select: {
                id: true,
                title: true,
                price: true,
                images: { take: 1, select: { url: true } },
                _count: { select: { saves: true } },
            },
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (prisma.order as any).findMany({
            where: { sellerId: store.id },
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
                id: true,
                status: true,
                totalAmount: true,
                createdAt: true,
                buyer: { select: { displayName: true, username: true } },
                items: { take: 1, select: { product: { select: { title: true } } } },
            },
        }),
        // Behavioral: store page visits from ViewTracker STORE_VIEW events
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (prisma as any).dailyEventSummary.aggregate({
            where: {
                type: 'STORE_VIEW',
                targetId: store.id,
                ...(dateFrom ? { date: { gte: dateFrom } } : {}),
            },
            _sum: { count: true },
        }),
    ]);

    const storePageVisits = storeVisitsAgg._sum?.count ?? 0;

    // Revenue & order calculations
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const completedRow = orderStats.find((r: any) => r.status === 'COMPLETED');
    const revenue = completedRow ? Number(completedRow._sum?.totalAmount ?? 0) : 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const totalOrders = orderStats.reduce((sum: number, r: any) => sum + r._count.id, 0);
    const activeOrders = orderStats
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((r: any) => ['PENDING', 'CONFIRMED', 'SHIPPED'].includes(r.status))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .reduce((sum: number, r: any) => sum + r._count.id, 0);

    // Conversion rate: orders / views (as %)
    const conversionRate = totalViews > 0 ? ((totalOrders / totalViews) * 100).toFixed(1) : '0.0';

    // Fee waiver countdown
    const feeWaiverDaysLeft = store.feeWaiverUntil
        ? Math.max(0, Math.ceil((new Date(store.feeWaiverUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : 0;

    const STATUS_LABEL: Record<string, string> = {
        PENDING: 'Pending', CONFIRMED: 'Confirmed', SHIPPED: 'Shipped',
        DELIVERED: 'Delivered', COMPLETED: 'Completed', CANCELLED: 'Cancelled',
        DISPUTED: 'Disputed', REFUNDED: 'Refunded',
    };
    const STATUS_COLOR: Record<string, string> = {
        PENDING: '#888', CONFIRMED: '#0066FF', SHIPPED: '#FF6B35',
        DELIVERED: 'var(--primary)', COMPLETED: 'var(--primary)', CANCELLED: '#636E72',
        DISPUTED: '#D63031', REFUNDED: '#888',
    };

    const periodLabel = period === '7d' ? 'last 7 days' : period === '30d' ? 'last 30 days' : 'all time';

    return (
        <main className={styles.page}>
            {/* Header */}
            <div className={styles.header}>
                <Link href={`/store/${slug}`} className={styles.back}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                </Link>
                <div>
                    <h1 className={styles.title}>Analytics</h1>
                    <p className={styles.sub}>{store.name}</p>
                </div>
                <Link href={`/store/${slug}/settings`} className={styles.settingsBtn}>Settings</Link>
            </div>

            {/* Fee waiver banner */}
            {feeWaiverDaysLeft > 0 && (
                <div className={styles.feeWaiver}>
                    <span className={styles.feeWaiverIcon}>🎁</span>
                    <div>
                        <span className={styles.feeWaiverTitle}>Free selling active</span>
                        <span className={styles.feeWaiverSub}>0% platform fee · {feeWaiverDaysLeft} day{feeWaiverDaysLeft !== 1 ? 's' : ''} remaining</span>
                    </div>
                </div>
            )}

            {/* Period filter */}
            <div className={styles.periodRow}>
                {(['7d', '30d', 'all'] as const).map((p) => (
                    <Link
                        key={p}
                        href={`/store/${slug}/analytics?period=${p}`}
                        className={`${styles.periodBtn} ${period === p ? styles.periodActive : ''}`}
                    >
                        {p === '7d' ? '7 days' : p === '30d' ? '30 days' : 'All time'}
                    </Link>
                ))}
            </div>

            {/* KPI grid */}
            <div className={styles.kpiGrid}>
                <div className={styles.kpi}>
                    <span className={styles.kpiValue}>₦{revenue.toLocaleString()}</span>
                    <span className={styles.kpiLabel}>Revenue</span>
                </div>
                <div className={styles.kpi}>
                    <span className={styles.kpiValue}>{totalOrders}</span>
                    <span className={styles.kpiLabel}>Orders · <span style={{ color: 'var(--primary)' }}>{conversionRate}% conv.</span></span>
                </div>
                <div className={styles.kpi}>
                    <span className={styles.kpiValue} style={{ color: activeOrders > 0 ? '#FF6B35' : undefined }}>{activeOrders}</span>
                    <span className={styles.kpiLabel}>Active Orders</span>
                </div>
                <div className={styles.kpi}>
                    <span className={styles.kpiValue}>{followerCount.toLocaleString()}</span>
                    <span className={styles.kpiLabel}>Followers</span>
                </div>
                <div className={styles.kpi}>
                    <span className={styles.kpiValue}>{totalViews.toLocaleString()}</span>
                    <span className={styles.kpiLabel}>Product Views · {periodLabel}</span>
                </div>
                <div className={styles.kpi}>
                    <span className={styles.kpiValue}>{totalSaves.toLocaleString()}</span>
                    <span className={styles.kpiLabel}>Saves · {periodLabel}</span>
                </div>
                <div className={styles.kpi}>
                    <span className={styles.kpiValue}>{totalLikes.toLocaleString()}</span>
                    <span className={styles.kpiLabel}>Likes · {periodLabel}</span>
                </div>
                <div className={styles.kpi}>
                    <span className={styles.kpiValue}>{storePageVisits.toLocaleString()}</span>
                    <span className={styles.kpiLabel}>Store Page Visits · {periodLabel}</span>
                </div>
                <div className={styles.kpi}>
                    <span className={styles.kpiValue}>{productCount}</span>
                    <span className={styles.kpiLabel}>Products Listed</span>
                </div>
                <div className={styles.kpi}>
                    <span className={styles.kpiValue}>{store.depCount}</span>
                    <span className={styles.kpiLabel}>Deps · {store.depTier.charAt(0) + store.depTier.slice(1).toLowerCase()}</span>
                </div>
                <div className={styles.kpi}>
                    <span className={styles.kpiValue}>{store.rating ? Number(store.rating).toFixed(1) : '—'}</span>
                    <span className={styles.kpiLabel}>Avg Rating ({store.reviewCount ?? 0} reviews)</span>
                </div>
            </div>

            {/* Orders by status */}
            {orderStats.length > 0 && (
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Orders by Status</h2>
                    <div className={styles.statusGrid}>
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {orderStats.map((r: any) => (
                            <div key={r.status} className={styles.statusChip} style={{ borderColor: STATUS_COLOR[r.status] ?? '#888' }}>
                                <span className={styles.statusCount} style={{ color: STATUS_COLOR[r.status] ?? '#888' }}>{r._count.id}</span>
                                <span className={styles.statusLabel}>{STATUS_LABEL[r.status] ?? r.status}</span>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Top products by views */}
            {topByViews.length > 0 && (
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Top Products by Views</h2>
                    <div className={styles.productList}>
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {topByViews.map((p: any, i: number) => (
                            <Link key={p.id} href={`/store/${slug}/products/${p.id}/edit`} className={styles.productRow}>
                                <span className={styles.rank}>#{i + 1}</span>
                                <div className={styles.productInfo}>
                                    <span className={styles.productTitle}>{p.title}</span>
                                    <span className={styles.productPrice}>₦{Number(p.price).toLocaleString()}</span>
                                </div>
                                <span className={styles.productStat}>{(p.viewCount ?? 0).toLocaleString()} views</span>
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {/* Top products by saves */}
            {topBySaves.length > 0 && (
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Most Saved Products</h2>
                    <div className={styles.productList}>
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {topBySaves.map((p: any, i: number) => (
                            <Link key={p.id} href={`/store/${slug}/products/${p.id}/edit`} className={styles.productRow}>
                                <span className={styles.rank}>#{i + 1}</span>
                                <div className={styles.productInfo}>
                                    <span className={styles.productTitle}>{p.title}</span>
                                    <span className={styles.productPrice}>₦{Number(p.price).toLocaleString()}</span>
                                </div>
                                <span className={styles.productStat}>{p._count?.saves ?? 0} saves</span>
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {/* Recent orders */}
            {recentOrders.length > 0 && (
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Recent Orders</h2>
                    <div className={styles.orderList}>
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {recentOrders.map((o: any) => (
                            <Link key={o.id} href="/orders" className={styles.orderRow}>
                                <div className={styles.orderInfo}>
                                    <span className={styles.orderProduct}>{o.items[0]?.product?.title ?? 'Order'}</span>
                                    <span className={styles.orderBuyer}>@{o.buyer?.username ?? o.buyer?.displayName}</span>
                                </div>
                                <div className={styles.orderRight}>
                                    <span className={styles.orderAmount}>₦{Number(o.totalAmount).toLocaleString()}</span>
                                    <span className={styles.orderStatus} style={{ color: STATUS_COLOR[o.status] ?? '#888' }}>
                                        {STATUS_LABEL[o.status] ?? o.status}
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {totalOrders === 0 && (
                <div className={styles.empty}>
                    <p>No orders yet. Share your store to start selling!</p>
                    <Link href={`/store/${slug}`} className={styles.emptyBtn}>View Store</Link>
                </div>
            )}
        </main>
    );
}
