import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireAdmin } from '@/lib/admin';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import styles from './page.module.css';

const STATUS_LABELS: Record<string, string> = {
    PENDING: 'Pending', CONFIRMED: 'Confirmed', SHIPPED: 'Shipped',
    DELIVERED: 'Delivered', COMPLETED: 'Completed', CANCELLED: 'Cancelled',
    DISPUTED: 'Disputed', RESOLVED_BUYER: 'Resolved (Buyer)',
    RESOLVED_VENDOR: 'Resolved (Seller)', REFUNDED: 'Refunded',
};

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
    const session = await getServerSession(authOptions);
    const check = requireAdmin(session, 'ADMIN');
    if (!check.ok) redirect('/');

    const { status } = await searchParams;

    const orders = await prisma.order.findMany({
        where: status ? { status: status as any } : {},
        orderBy: { createdAt: 'desc' },
        include: {
            buyer: { select: { id: true, displayName: true, email: true } },
            seller: { select: { id: true, name: true, slug: true } },
            items: { include: { product: { select: { title: true } } } }
        },
        take: 100 // Last 100 orders
    });

    const fmtNgn = (n: number) => `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <h1 className={styles.title}>Order Management</h1>
                <div className={styles.filters}>
                    <Link href="/admin/orders" className={`${styles.filterLink} ${!status ? styles.active : ''}`}>All</Link>
                    {Object.entries(STATUS_LABELS).map(([key, label]) => (
                        <Link
                            key={key}
                            href={`/admin/orders?status=${key}`}
                            className={`${styles.filterLink} ${status === key ? styles.active : ''}`}
                        >
                            {label}
                        </Link>
                    ))}
                </div>
            </div>

            <div className={styles.tableWrap}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Order ID</th>
                            <th>Buyer</th>
                            <th>Seller</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Date</th>
                            <th>Items</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.map(order => (
                            <tr key={order.id}>
                                <td className={styles.mono}>{order.id.slice(0, 8)}...</td>
                                <td>
                                    <div className={styles.entity}>
                                        <span className={styles.name}>{order.buyer.displayName || 'Unnamed User'}</span>
                                        <span className={styles.email}>{order.buyer.email}</span>
                                    </div>
                                </td>
                                <td>
                                    <div className={styles.entity}>
                                        <span className={styles.name}>{order.seller.name}</span>
                                        <span className={styles.slug}>@{order.seller.slug}</span>
                                    </div>
                                </td>
                                <td><strong>{fmtNgn(Number(order.totalAmount))}</strong></td>
                                <td>
                                    <span className={`${styles.statusBadge} ${styles[order.status.toLowerCase()] || ''}`}>
                                        {STATUS_LABELS[order.status] || order.status}
                                    </span>
                                </td>
                                <td className={styles.date}>{new Date(order.createdAt).toLocaleDateString()}</td>
                                <td className={styles.items}>
                                    {order.items.map((item, i) => (
                                        <div key={i} className={styles.itemSnippet}>
                                            {item.product?.title || 'Unknown Product'} x{item.quantity}
                                        </div>
                                    ))}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {orders.length === 0 && <div className={styles.empty}>No orders found for this status.</div>}
            </div>
        </div>
    );
}
