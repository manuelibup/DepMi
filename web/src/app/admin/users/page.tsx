import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireAdmin } from '@/lib/admin';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import UserTable from './UserTable';
import styles from './page.module.css';

export default async function UsersPage() {
    const session = await getServerSession(authOptions);
    const check = requireAdmin(session, 'ADMIN');
    if (!check.ok) redirect('/');

    const [users, total] = await Promise.all([
        prisma.user.findMany({
            orderBy: { createdAt: 'desc' },
            take: 20,
            select: {
                id: true, displayName: true, email: true, username: true,
                avatarUrl: true, depCount: true, depTier: true, kycTier: true,
                adminRole: true, isBanned: true, createdAt: true, lastActiveAt: true,
                _count: { select: { followers: true, stores: true, ordersAsBuyer: true } },
            },
        }),
        prisma.user.count(),
    ]);

    const serialized = users.map(u => ({
        ...u,
        createdAt: u.createdAt.toISOString(),
        lastActiveAt: u.lastActiveAt?.toISOString() ?? null,
    }));

    return (
        <div className={styles.page}>
            <h1 className={styles.pageTitle}>Users</h1>
            <UserTable initial={serialized} initialTotal={total} />
        </div>
    );
}
