import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireAdmin } from '@/lib/admin';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import KpiCard from './KpiCard';
import SignupsChart from './SignupsChart';
import DauChart from './DauChart';
import InviteForm from './InviteForm';
import BulkFollowForm from './BulkFollowForm';
import styles from './page.module.css';

function fmt(n: number) {
    return n >= 1_000_000
        ? `${(n / 1_000_000).toFixed(1)}M`
        : n >= 1_000
            ? `${(n / 1_000).toFixed(1)}K`
            : String(n);
}

export default async function AdminDashboard() {
    const session = await getServerSession(authOptions);
    const check = requireAdmin(session, 'MODERATOR');
    if (!check.ok) redirect('/');

    const [
        users, stores, products, posts, demands, activeOrders, disputedOrders, signupRows, dauRows,
        totalSpentRaw, productWorthRaw, ordersCreated, ordersCompleted, ordersCancelled
    ] =
        await Promise.all([
            prisma.user.count(),
            prisma.store.count(),
            prisma.product.count(),
            (prisma as any).post.count(),
            prisma.demand.count(),
            prisma.order.count({ where: { status: { in: ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED'] } } }),
            prisma.order.count({ where: { status: 'DISPUTED' } }),
            prisma.$queryRawUnsafe<{ date: Date; count: bigint }[]>(`
                SELECT DATE_TRUNC('day', "createdAt") AS date, COUNT(*) AS count
                FROM "User"
                GROUP BY date ORDER BY date DESC LIMIT 30
            `),
            prisma.$queryRawUnsafe<{ date: Date; dau: bigint }[]>(`
                SELECT DATE_TRUNC('day', "lastActiveAt") AS date, COUNT(*) AS dau
                FROM "User"
                WHERE "lastActiveAt" IS NOT NULL
                  AND "lastActiveAt" >= NOW() - INTERVAL '30 days'
                GROUP BY date ORDER BY date ASC
            `),
            prisma.order.aggregate({
                where: { status: { in: ['DELIVERED', 'COMPLETED'] } },
                _sum: { totalAmount: true }
            }),
            prisma.$queryRawUnsafe<{ total: bigint }[]>(`SELECT SUM(price * stock) as total FROM "Product"`),
            prisma.order.count(),
            prisma.order.count({ where: { status: { in: ['DELIVERED', 'COMPLETED'] } } }),
            prisma.order.count({ where: { status: 'CANCELLED' } })
        ]);

    const totalSpent = Number(totalSpentRaw._sum.totalAmount || 0);
    const productWorth = Number(productWorthRaw[0]?.total || 0);

    const totalSignups30d = signupRows.reduce((acc: number, r: any) => acc + Number(r.count), 0);
    const avgDailySignups = signupRows.length > 0 ? (totalSignups30d / signupRows.length).toFixed(1) : '0';

    const signups = signupRows
        .map((r: any) => ({ date: r.date.toISOString().split('T')[0], count: Number(r.count) }))
        .reverse();

    const dau = dauRows.map((r: any) => ({
        date: r.date.toISOString().split('T')[0],
        dau: Number(r.dau),
    }));

    return (
        <div className={styles.page}>
            <h1 className={styles.pageTitle}>Overview</h1>

            <div className={styles.kpiGrid}>
                <KpiCard label="Total Users" value={fmt(users)} href="/admin/users"
                    icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>} />
                <KpiCard label="Avg Daily Signups" value={avgDailySignups}
                    icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><polyline points="17 11 19 13 23 9" /></svg>}
                    color="#14b8a6" />
                <KpiCard label="Stores" value={fmt(stores)} href="/admin/stores"
                    icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>}
                    color="#22c55e" />
                <KpiCard label="Products" value={fmt(products)}
                    icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>}
                    color="#f59e0b" />
                <KpiCard label="Posts" value={fmt(posts)}
                    icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>}
                    color="#a855f7" />
                <KpiCard label="Demands" value={fmt(demands)}
                    icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>}
                    color="#06b6d4" />
                <KpiCard label="Active Orders" value={fmt(activeOrders)} href="/admin/orders"
                    icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" /></svg>}
                    color="#0066FF" />
                <KpiCard label="Disputed Orders" value={disputedOrders} href="/admin/orders?status=DISPUTED"
                    icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>}
                    color="#ef4444" />
                <KpiCard label="Total Spent (₦)" value={fmt(totalSpent)} href="/admin/commerce"
                    icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2" ry="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>}
                    color="#10b981" />
                <KpiCard label="Product Worth (₦)" value={fmt(productWorth)}
                    icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>}
                    color="#8b5cf6" />
                <KpiCard label="Total Orders" value={fmt(ordersCreated)}
                    icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>}
                    color="#3b82f6" />
                <KpiCard label="Completed Orders" value={fmt(ordersCompleted)}
                    icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>}
                    color="#14b8a6" />
                <KpiCard label="Cancelled Orders" value={fmt(ordersCancelled)}
                    icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>}
                    color="#fb7185" />
            </div>

            <div className={styles.chartsGrid}>
                <SignupsChart initial={signups} />
                <DauChart data={dau} />
            </div>

            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Vendor Invites</h2>
                <InviteForm />
            </div>

            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Auto Bulk Follows</h2>
                <BulkFollowForm />
            </div>
        </div>
    );
}
