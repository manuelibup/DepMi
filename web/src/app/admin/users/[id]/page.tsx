import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireAdmin } from '@/lib/admin';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import UserActions from './UserActions';
import styles from './page.module.css';

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    const check = requireAdmin(session, 'ADMIN');
    if (!check.ok) redirect('/');

    const { id } = await params;

    const user = await prisma.user.findUnique({
        where: { id },
        select: {
            id: true, displayName: true, email: true, username: true, phoneNumber: true,
            avatarUrl: true, bio: true, depCount: true, depTier: true,
            kycTier: true, adminRole: true, isBanned: true, createdAt: true, lastActiveAt: true,
            _count: { select: { followers: true, following: true, ordersAsBuyer: true } },
            stores: {
                select: {
                    id: true, name: true, slug: true, verificationStatus: true, isActive: true,
                    depCount: true, rating: true, reviewCount: true,
                    _count: { select: { products: true, ordersAsSeller: true } },
                },
            },
            ordersAsBuyer: {
                orderBy: { createdAt: 'desc' },
                take: 10,
                select: {
                    id: true, totalAmount: true, status: true, createdAt: true,
                    seller: { select: { name: true } },
                },
            },
            depTransactions: {
                orderBy: { createdAt: 'desc' },
                take: 10,
                select: { id: true, amount: true, reason: true, createdAt: true },
            },
        },
    });

    if (!user) notFound();

    const totalSpend = user.ordersAsBuyer
        .filter(o => o.status === 'COMPLETED')
        .reduce((s, o) => s + Number(o.totalAmount), 0);

    return (
        <div className={styles.page}>
            <Link href="/admin/users" className={styles.back}>← Back to Users</Link>

            <div className={styles.header}>
                <div className={styles.avatarWrap}>
                    {user.avatarUrl
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={user.avatarUrl} alt="" className={styles.avatar} />
                        : <div className={styles.avatarFallback}>{user.displayName.slice(0, 2).toUpperCase()}</div>}
                    {user.isBanned && <span className={styles.bannedBadge}>BANNED</span>}
                </div>
                <div className={styles.identity}>
                    <h1 className={styles.name}>{user.displayName}</h1>
                    <p className={styles.handle}>@{user.username ?? '—'} · {user.email}</p>
                    {user.bio && <p className={styles.bio}>{user.bio}</p>}
                    <div className={styles.tags}>
                        <span className={styles.tag}>{user.depTier}</span>
                        <span className={styles.tag}>{user.kycTier}</span>
                        {user.adminRole && <span className={`${styles.tag} ${styles.tagAdmin}`}>{user.adminRole}</span>}
                    </div>
                </div>
                <div className={styles.actions}>
                    <UserActions userId={user.id} isBanned={user.isBanned} isAdmin={!!user.adminRole} />
                </div>
            </div>

            <div className={styles.statsRow}>
                <div className={styles.stat}><span className={styles.statVal}>{user.depCount}</span><span className={styles.statLabel}>Dep Score</span></div>
                <div className={styles.stat}><span className={styles.statVal}>{user._count.followers}</span><span className={styles.statLabel}>Followers</span></div>
                <div className={styles.stat}><span className={styles.statVal}>{user._count.following}</span><span className={styles.statLabel}>Following</span></div>
                <div className={styles.stat}><span className={styles.statVal}>{user._count.ordersAsBuyer}</span><span className={styles.statLabel}>Orders</span></div>
                <div className={styles.stat}><span className={styles.statVal}>₦{totalSpend.toLocaleString()}</span><span className={styles.statLabel}>Total Spend</span></div>
                <div className={styles.stat}><span className={styles.statVal}>{user.lastActiveAt ? new Date(user.lastActiveAt).toLocaleDateString() : '—'}</span><span className={styles.statLabel}>Last Active</span></div>
            </div>

            {user.stores.length > 0 && (
                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>Stores</h2>
                    {user.stores.map(s => (
                        <div key={s.id} className={styles.storeRow}>
                            <Link href={`/admin/stores`} className={styles.storeName}>{s.name}</Link>
                            <span className={styles.tag}>{s.verificationStatus}</span>
                            {!s.isActive && <span className={`${styles.tag} ${styles.tagDanger}`}>Suspended</span>}
                            <span className={styles.statMini}>{s._count.products} products</span>
                            <span className={styles.statMini}>{s._count.ordersAsSeller} orders</span>
                            <span className={styles.statMini}>⭐ {s.rating.toFixed(1)}</span>
                        </div>
                    ))}
                </div>
            )}

            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Recent Orders (as Buyer)</h2>
                {user.ordersAsBuyer.length === 0
                    ? <p className={styles.empty}>No orders yet.</p>
                    : <table className={styles.table}>
                        <thead><tr><th>ID</th><th>Seller</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
                        <tbody>
                            {user.ordersAsBuyer.map(o => (
                                <tr key={o.id}>
                                    <td className={styles.mono}>#{o.id.slice(-8)}</td>
                                    <td>{o.seller.name}</td>
                                    <td>₦{Number(o.totalAmount).toLocaleString()}</td>
                                    <td><span className={styles.tag}>{o.status}</span></td>
                                    <td>{new Date(o.createdAt).toLocaleDateString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>}
            </div>

            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Dep History</h2>
                {user.depTransactions.length === 0
                    ? <p className={styles.empty}>No dep transactions.</p>
                    : <table className={styles.table}>
                        <thead><tr><th>Amount</th><th>Reason</th><th>Date</th></tr></thead>
                        <tbody>
                            {user.depTransactions.map(t => (
                                <tr key={t.id}>
                                    <td style={{ color: t.amount > 0 ? '#22c55e' : '#ef4444' }}>{t.amount > 0 ? '+' : ''}{t.amount}</td>
                                    <td>{t.reason}</td>
                                    <td>{new Date(t.createdAt).toLocaleDateString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>}
            </div>
        </div>
    );
}
