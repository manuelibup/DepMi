import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import styles from './Analytics.module.css';

export const dynamic = 'force-dynamic';

export default async function StoreAnalyticsPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) redirect('/login');

    const store = await prisma.store.findUnique({
        where: { slug },
        select: { id: true, name: true, ownerId: true, depCount: true, depTier: true, reviewCount: true, ratingAvg: true },
    });
    if (!store) notFound();
    if (store.ownerId !== session.user.id) redirect(`/store/${slug}`);

    // Parallel queries for all analytics data
    const [
        totalViews,
        totalSaves,
        totalLikes,
        orderStats,
        topByViews,
        topBySaves,
        recentOrders,
    ] = await Promise.all([
        // Total product views
        prisma.productView.count({
            where: { product: { storeId: store.id } },
        }),
        // Total saves
        prisma.savedProduct.count({
            where: { product: { storeId: store.id } },
        }),
        // Total likes
        prisma.productLike.count({
            where: { product: { storeId: store.id } },
        }),
        // Order breakdown by status
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (prisma.order as any).groupBy({
            by: ['status'],
            where: { sellerId: store.id },
            _count: { id: true },
            _sum: { totalAmount: true },
        }),
        // Top 5 products by views
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (prisma.product as any).findMany({
            where: { storeId: store.id },
            orderBy: { viewCount: 'desc' },
            take: 5,
            select: { id: true, title: true, viewCount: true, price: true, images: { take: 1, select: { url: true } } },
        }),
        // Top 5 products by saves
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (prisma.product as any).findMany({
            where: { storeId: store.id },
            orderBy: { _count: { saves: true } } as any,
            take: 5,
            select: { id: true, title: true, price: true, images: { take: 1, select: { url: true } }, _count: { select: { saves: true } } },
        }),
        // Last 5 orders
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (prisma.order as any).findMany({
            where: { sellerId: store.id },
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
                id: true, status: true, totalAmount: true, createdAt: true,
                buyer: { select: { displayName: true, username: true } },
                items: { take: 1, select: { product: { select: { title: true } } } },
            },
        }),
    ]);

    // Calculate revenue from completed orders
    const completedRow = orderStats.find((r: any) => r.status === 'COMPLETED');
    const revenue = completedRow ? Number(completedRow._sum?.totalAmount ?? 0) : 0;
    const totalOrders = orderStats.reduce((sum: number, r: any) => sum + r._count.id, 0);
    const activeOrders = orderStats
        .filter((r: any) => ['PENDING', 'CONFIRMED', 'SHIPPED'].includes(r.status))
        .reduce((sum: number, r: any) => sum + r._count.id, 0);

    const STATUS_LABEL: Record<string, string> = {
        PENDING: 'Pending', CONFIRMED: 'Confirmed', SHIPPED: 'Shipped',
        DELIVERED: 'Delivered', COMPLETED: 'Completed', CANCELLED: 'Cancelled',
        DISPUTED: 'Disputed', REFUNDED: 'Refunded',
    };
    const STATUS_COLOR: Record<string, string> = {
        PENDING: '#888', CONFIRMED: '#0066FF', SHIPPED: '#FF6B35',
        DELIVERED: '#00B894', COMPLETED: '#00C853', CANCELLED: '#636E72',
        DISPUTED: '#D63031', REFUNDED: '#888',
    };

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

            {/* KPI grid */}
            <div className={styles.kpiGrid}>
                <div className={styles.kpi}>
                    <span className={styles.kpiValue}>₦{revenue.toLocaleString()}</span>
                    <span className={styles.kpiLabel}>Total Revenue</span>
                </div>
                <div className={styles.kpi}>
                    <span className={styles.kpiValue}>{totalOrders}</span>
                    <span className={styles.kpiLabel}>Total Orders</span>
                </div>
                <div className={styles.kpi}>
                    <span className={styles.kpiValue} style={{ color: activeOrders > 0 ? '#FF6B35' : undefined }}>{activeOrders}</span>
                    <span className={styles.kpiLabel}>Active Orders</span>
                </div>
                <div className={styles.kpi}>
                    <span className={styles.kpiValue}>{totalViews.toLocaleString()}</span>
                    <span className={styles.kpiLabel}>Product Views</span>
                </div>
                <div className={styles.kpi}>
                    <span className={styles.kpiValue}>{totalSaves.toLocaleString()}</span>
                    <span className={styles.kpiLabel}>Saves</span>
                </div>
                <div className={styles.kpi}>
                    <span className={styles.kpiValue}>{totalLikes.toLocaleString()}</span>
                    <span className={styles.kpiLabel}>Likes</span>
                </div>
                <div className={styles.kpi}>
                    <span className={styles.kpiValue}>{store.depCount}</span>
                    <span className={styles.kpiLabel}>Deps · {store.depTier.charAt(0) + store.depTier.slice(1).toLowerCase()}</span>
                </div>
                <div className={styles.kpi}>
                    <span className={styles.kpiValue}>{store.ratingAvg ? Number(store.ratingAvg).toFixed(1) : '—'}</span>
                    <span className={styles.kpiLabel}>Avg Rating ({store.reviewCount ?? 0} reviews)</span>
                </div>
            </div>

            {/* Orders by status */}
            {orderStats.length > 0 && (
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Orders by Status</h2>
                    <div className={styles.statusGrid}>
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
