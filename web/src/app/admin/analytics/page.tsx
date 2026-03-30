import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireAdmin } from '@/lib/admin';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import KpiCard from '../dashboard/KpiCard';
import styles from '../engagement/page.module.css';

export const dynamic = 'force-dynamic';

type EventRow = { type: string; _count: { id: number } };
type TopRow = { targetId: string | null; _count: { id: number } };

function fmt(n: number) {
    return n >= 1_000_000
        ? `${(n / 1_000_000).toFixed(1)}M`
        : n >= 1_000
            ? `${(n / 1_000).toFixed(1)}K`
            : String(n);
}

export default async function AnalyticsPage() {
    const session = await getServerSession(authOptions);
    const check = requireAdmin(session, 'ADMIN');
    if (!check.ok) redirect('/');

    const now = new Date();
    const ago24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const ago7d  = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000);
    const ago30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ev = prisma.event as any;

    const [
        totalEvents,
        events24h,
        events7d,
        byType7d,
        topImpressions7d,
        topProductViews7d,
        topDemandViews7d,
        uniqueSessions24h,
        uniqueSessions7d,
        optOutCount,
        totalUsers,
    ] = await Promise.all([
        ev.count(),
        ev.count({ where: { createdAt: { gte: ago24h } } }),
        ev.count({ where: { createdAt: { gte: ago7d } } }),
        ev.groupBy({
            by: ['type'],
            where: { createdAt: { gte: ago7d } },
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
        }),
        ev.groupBy({
            by: ['targetId'],
            where: { type: 'FEED_IMPRESSION', targetType: 'product', createdAt: { gte: ago7d }, targetId: { not: null } },
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
            take: 10,
        }),
        ev.groupBy({
            by: ['targetId'],
            where: { type: 'PRODUCT_VIEW', createdAt: { gte: ago7d }, targetId: { not: null } },
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
            take: 10,
        }),
        ev.groupBy({
            by: ['targetId'],
            where: { type: 'DEMAND_VIEW', createdAt: { gte: ago7d }, targetId: { not: null } },
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
            take: 10,
        }),
        ev.findMany({
            where: { createdAt: { gte: ago24h } },
            distinct: ['sessionId'],
            select: { sessionId: true },
        }).then((r: { sessionId: string }[]) => r.length),
        ev.findMany({
            where: { createdAt: { gte: ago7d } },
            distinct: ['sessionId'],
            select: { sessionId: true },
        }).then((r: { sessionId: string }[]) => r.length),
        prisma.user.count({ where: { analyticsOptOut: true } }),
        prisma.user.count(),
    ]);

    // Resolve product IDs to titles
    const productImpressionIds = (topImpressions7d as TopRow[]).map(r => r.targetId).filter(Boolean) as string[];
    const productViewIds = (topProductViews7d as TopRow[]).map(r => r.targetId).filter(Boolean) as string[];
    const demandViewIds = (topDemandViews7d as TopRow[]).map(r => r.targetId).filter(Boolean) as string[];

    const [impProducts, viewProducts, viewDemands] = await Promise.all([
        prisma.product.findMany({
            where: { id: { in: productImpressionIds } },
            select: { id: true, title: true },
        }),
        prisma.product.findMany({
            where: { id: { in: productViewIds } },
            select: { id: true, title: true },
        }),
        prisma.demand.findMany({
            where: { id: { in: demandViewIds } },
            select: { id: true, text: true },
        }),
    ]);

    const productMap = Object.fromEntries([...impProducts, ...viewProducts].map(p => [p.id, p.title]));
    const demandMap = Object.fromEntries(viewDemands.map(d => [d.id, d.text]));

    const TYPE_LABEL: Record<string, string> = {
        FEED_IMPRESSION: 'Feed Impressions',
        PRODUCT_VIEW: 'Product Views',
        DEMAND_VIEW: 'Demand Views',
        STORE_VIEW: 'Store Views',
        SEARCH: 'Searches',
        LIKE: 'Likes',
        SAVE: 'Saves',
        BID: 'Bids',
        ORDER: 'Orders',
        SHARE: 'Shares',
    };
    const TYPE_COLOR: Record<string, string> = {
        FEED_IMPRESSION: '#a855f7',
        PRODUCT_VIEW: '#0066FF',
        DEMAND_VIEW: '#06b6d4',
        STORE_VIEW: '#22c55e',
        SEARCH: '#f59e0b',
        LIKE: '#ef4444',
        SAVE: '#FF5C38',
        BID: '#FF6B35',
        ORDER: '#10b981',
        SHARE: '#6366f1',
    };

    const optOutPct = totalUsers > 0 ? ((optOutCount / totalUsers) * 100).toFixed(1) : '0';

    return (
        <div className={styles.page}>
            <h1 className={styles.pageTitle}>Behavioral Analytics</h1>

            {/* Top KPIs */}
            <div className={styles.kpiGrid}>
                <KpiCard label="Total Events (all time)" value={fmt(totalEvents)}
                    icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}
                    color="#a855f7" />
                <KpiCard label="Events (last 24h)" value={fmt(events24h)}
                    icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
                    color="#0066FF" />
                <KpiCard label="Events (last 7d)" value={fmt(events7d)}
                    icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
                    color="#06b6d4" />
                <KpiCard label="Unique Sessions (24h)" value={fmt(uniqueSessions24h)}
                    icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>}
                    color="#22c55e" />
                <KpiCard label="Unique Sessions (7d)" value={fmt(uniqueSessions7d)}
                    icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
                    color="#14b8a6" />
                <KpiCard label={`Opted Out (${optOutPct}%)`} value={fmt(optOutCount)}
                    icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>}
                    color="#888" />
            </div>

            {/* Event breakdown by type (7d) */}
            {(byType7d as EventRow[]).length > 0 && (
                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>Events by Type — Last 7 Days</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                        {(byType7d as EventRow[]).map(r => (
                            <div key={r.type} style={{
                                background: 'rgba(255,255,255,0.03)',
                                border: `1px solid ${TYPE_COLOR[r.type] ?? '#333'}33`,
                                borderRadius: '12px',
                                padding: '14px 16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '12px',
                            }}>
                                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary, #aaa)' }}>
                                    {TYPE_LABEL[r.type] ?? r.type}
                                </span>
                                <span style={{ fontSize: '1.1rem', fontWeight: 700, color: TYPE_COLOR[r.type] ?? '#fff' }}>
                                    {fmt(r._count.id)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className={styles.tablesGrid}>
                {/* Top products by impressions */}
                {(topImpressions7d as TopRow[]).length > 0 && (
                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>Top Products by Feed Impressions (7d)</h2>
                        <table className={styles.table}>
                            <thead><tr><th>#</th><th>Product</th><th>Impressions</th></tr></thead>
                            <tbody>
                                {(topImpressions7d as TopRow[]).map((r, i) => (
                                    <tr key={r.targetId}>
                                        <td style={{ color: 'var(--text-muted)', width: 28 }}>{i + 1}</td>
                                        <td className={styles.truncate}>
                                            {r.targetId ? (productMap[r.targetId] ?? r.targetId.slice(0, 8) + '…') : '—'}
                                        </td>
                                        <td style={{ color: '#a855f7', fontWeight: 700 }}>{fmt(r._count.id)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Top products by views */}
                {(topProductViews7d as TopRow[]).length > 0 && (
                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>Top Products by Views (7d)</h2>
                        <table className={styles.table}>
                            <thead><tr><th>#</th><th>Product</th><th>Views</th></tr></thead>
                            <tbody>
                                {(topProductViews7d as TopRow[]).map((r, i) => (
                                    <tr key={r.targetId}>
                                        <td style={{ color: 'var(--text-muted)', width: 28 }}>{i + 1}</td>
                                        <td className={styles.truncate}>
                                            {r.targetId ? (productMap[r.targetId] ?? r.targetId.slice(0, 8) + '…') : '—'}
                                        </td>
                                        <td style={{ color: '#0066FF', fontWeight: 700 }}>{fmt(r._count.id)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Top demands by views */}
                {(topDemandViews7d as TopRow[]).length > 0 && (
                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>Top Requests by Views (7d)</h2>
                        <table className={styles.table}>
                            <thead><tr><th>#</th><th>Request</th><th>Views</th></tr></thead>
                            <tbody>
                                {(topDemandViews7d as TopRow[]).map((r, i) => (
                                    <tr key={r.targetId}>
                                        <td style={{ color: 'var(--text-muted)', width: 28 }}>{i + 1}</td>
                                        <td className={styles.truncate}>
                                            {r.targetId ? ((demandMap[r.targetId] ?? '').slice(0, 60) || r.targetId.slice(0, 8) + '…') : '—'}
                                        </td>
                                        <td style={{ color: '#06b6d4', fontWeight: 700 }}>{fmt(r._count.id)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {totalEvents === 0 && (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                    <p style={{ fontSize: '1rem', marginBottom: 8 }}>No events tracked yet.</p>
                    <p style={{ fontSize: '0.85rem' }}>Events will appear here as users browse the feed.</p>
                </div>
            )}
        </div>
    );
}
