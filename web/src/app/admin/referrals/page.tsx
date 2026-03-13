import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireAdmin } from '@/lib/admin';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import ReferralSettings from './ReferralSettings';
import styles from './page.module.css';

export default async function ReferralsPage() {
    const session = await getServerSession(authOptions);
    const check = requireAdmin(session, 'SUPER_ADMIN');
    if (!check.ok) redirect('/');

    const [config, codesRaw] = await Promise.all([
        prisma.referralConfig.upsert({
            where: { id: 'singleton' },
            update: {},
            create: { id: 'singleton', globalEnabled: false, rewardPercentage: 5.0, durationDays: 30 },
        }),
        prisma.referralCode.findMany({
            orderBy: { createdAt: 'desc' },
            take: 50,
            select: {
                id: true, code: true, perUserEnabled: true, createdAt: true,
                user: { select: { id: true, displayName: true, email: true, avatarUrl: true } },
                _count: { select: { referrals: true } },
            },
        }),
    ]);

    const codes = codesRaw.map(c => ({ ...c, createdAt: c.createdAt.toISOString() }));

    return (
        <div className={styles.page}>
            <h1 className={styles.pageTitle}>Referrals</h1>
            <ReferralSettings
                initialConfig={config}
                initialCodes={codes}
                isSuperAdmin={check.role === 'SUPER_ADMIN'}
            />
        </div>
    );
}
