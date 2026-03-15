import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireAdmin } from '@/lib/admin';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import KpiCard from '../dashboard/KpiCard';
import DisputeQueue from './DisputeQueue';
import styles from './page.module.css';

const STATUS_LABELS: Record<string, string> = {
    PENDING: 'Pending', CONFIRMED: 'Confirmed', SHIPPED: 'Shipped',
    DELIVERED: 'Delivered', COMPLETED: 'Completed', CANCELLED: 'Cancelled',
    DISPUTED: 'Disputed', RESOLVED_BUYER: 'Resolved (Buyer)',
    RESOLVED_VENDOR: 'Resolved (Seller)', REFUNDED: 'Refunded',
};

export default async function CommercePage() {
    const session = await getServerSession(authOptions);
    const check = requireAdmin(session, 'ADMIN');
    if (!check.ok) redirect('/');

    const [gmvAgg, escrowAgg, feesAgg, orderGroups, disputes] = await Promise.all([
        prisma.order.aggregate({ _sum: { totalAmount: true }, where: { status: 'COMPLETED' } }),
        prisma.order.aggregate({ _sum: { totalAmount: true }, where: { escrowStatus: 'HELD', status: { in: ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED'] } } }),
        prisma.order.aggregate({ _sum: { platformFeeNgn: true }, where: { status: 'COMPLETED' } }),
        prisma.order.groupBy({ by: ['status'], _count: { id: true } }),
        prisma.order.findMany({
            where: { status: 'DISPUTED' },
            orderBy: { updatedAt: 'desc' },
            select: {
                id: true, totalAmount: true, createdAt: true, updatedAt: true,
                buyer: { select: { id: true, displayName: true, email: true, avatarUrl: true } },
                seller: { select: { id: true, name: true, slug: true, logoUrl: true } },
                items: { take: 1, select: { product: { select: { title: true } } } },
            },
        }),
    ]);

    const gmv = Number(gmvAgg._sum.totalAmount ?? 0);
    const escrowBalance = Number(escrowAgg._sum.totalAmount ?? 0);
    const platformFees = Number(feesAgg._sum.platformFeeNgn ?? 0);
    const statusMap = Object.fromEntries(orderGroups.map(g => [g.status, g._count.id]));

    const serializedDisputes = disputes.map(d => ({
        ...d,
        totalAmount: Number(d.totalAmount),
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
    }));

    const fmtNgn = (n: number) => `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return (
        <div className={styles.page}>
            <h1 className={styles.pageTitle}>Commerce</h1>

            <div className={styles.kpiGrid}>
                <KpiCard label="Total GMV" value={fmtNgn(gmv)}
                    icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>}
                    color="#22c55e" />
                <KpiCard label="Escrow (In Transit)" value={fmtNgn(escrowBalance)}
                    icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>}
                    color="#f59e0b" />
                <KpiCard label="Platform Fees Earned" value={fmtNgn(platformFees)}
                    icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>}
                    color="#0066FF" />
                <KpiCard label="Active Disputes" value={statusMap['DISPUTED'] ?? 0}
                    icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /></svg>}
                    color="#ef4444" />
            </div>

            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Orders by Status</h2>
                <div className={styles.statusGrid}>
                    {Object.entries(STATUS_LABELS).map(([status, label]) => (
                        <Link key={status} href={`/admin/orders?status=${status}`} className={styles.statusCell}>
                            <span className={styles.statusLabel}>{label}</span>
                            <span className={styles.statusCount}>{statusMap[status] ?? 0}</span>
                        </Link>
                    ))}
                </div>
            </div>

            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Dispute Queue</h2>
                <DisputeQueue initial={serializedDisputes} />
            </div>
        </div>
    );
}
