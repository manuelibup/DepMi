import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireAdmin } from '@/lib/admin';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import StoreActions from './StoreActions';
import styles from './page.module.css';

export default async function StoresPage() {
    const session = await getServerSession(authOptions);
    const check = requireAdmin(session, 'ADMIN');
    if (!check.ok) redirect('/');

    const stores = await prisma.store.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
            id: true, name: true, slug: true, logoUrl: true,
            verificationStatus: true, isActive: true, depCount: true,
            rating: true, reviewCount: true, createdAt: true,
            owner: { select: { id: true, displayName: true, email: true } },
            _count: { select: { products: true, ordersAsSeller: true } },
        },
    });

    return (
        <div className={styles.page}>
            <h1 className={styles.pageTitle}>Stores <span className={styles.count}>{stores.length}</span></h1>
            <div className={styles.tableWrap}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Store</th>
                            <th>Owner</th>
                            <th>Products</th>
                            <th>Orders</th>
                            <th>Rating</th>
                            <th>Verification</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stores.map(s => (
                            <tr key={s.id} className={!s.isActive ? styles.suspended : ''}>
                                <td>
                                    <div className={styles.storeCell}>
                                        <span className={styles.storeLogo}>
                                            {s.logoUrl
                                                // eslint-disable-next-line @next/next/no-img-element
                                                ? <img src={s.logoUrl} alt="" />
                                                : s.name.slice(0, 2).toUpperCase()}
                                        </span>
                                        <span>
                                            <span className={styles.storeName}>{s.name}</span>
                                            <span className={styles.storeSlug}>/{s.slug}</span>
                                        </span>
                                    </div>
                                </td>
                                <td className={styles.owner}>{s.owner.displayName}</td>
                                <td>{s._count.products}</td>
                                <td>{s._count.ordersAsSeller}</td>
                                <td>⭐ {s.rating.toFixed(1)}</td>
                                <td>
                                    <span className={`${styles.verBadge} ${styles[s.verificationStatus.toLowerCase()]}`}>
                                        {s.verificationStatus}
                                    </span>
                                </td>
                                <td>
                                    <StoreActions
                                        storeId={s.id}
                                        verificationStatus={s.verificationStatus as never}
                                        isActive={s.isActive}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
