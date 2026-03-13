import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireAdmin } from '@/lib/admin';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import AdminManager from './AdminManager';
import styles from './page.module.css';

export default async function AdminsPage() {
    const session = await getServerSession(authOptions);
    const check = requireAdmin(session, 'SUPER_ADMIN');
    if (!check.ok) redirect('/');

    const admins = await prisma.user.findMany({
        where: { adminRole: { not: null } },
        orderBy: { createdAt: 'asc' },
        select: {
            id: true, displayName: true, email: true, username: true,
            avatarUrl: true, adminRole: true, createdAt: true, lastActiveAt: true,
        },
    });

    const serialized = admins.map(a => ({
        ...a,
        adminRole: a.adminRole as NonNullable<typeof a.adminRole>,
        createdAt: a.createdAt.toISOString(),
        lastActiveAt: a.lastActiveAt?.toISOString() ?? null,
    }));

    return (
        <div className={styles.page}>
            <h1 className={styles.pageTitle}>Admin Management</h1>
            <AdminManager initial={serialized} currentUserId={session!.user.id} />
        </div>
    );
}
