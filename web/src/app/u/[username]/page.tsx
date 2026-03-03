import React from 'react';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import styles from './page.module.css';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

interface ProfilePageProps {
    params: Promise<{
        username: string;
    }>;
}

// Map DepTier to label and emoji (matches agent.md spec)
const TIER_META = {
    SEEDLING: { label: '🌱 Seedling', style: '' },
    RISING:   { label: '⭐ Rising',   style: '' },
    TRUSTED:  { label: '🔥 Trusted',  style: '' },
    ELITE:    { label: '💎 Elite',    style: '' },
    LEGEND:   { label: '🏆 Legend',   style: styles.tierLegend },
};

export default async function ProfilePage({ params }: ProfilePageProps) {
    const { username } = await params;
    const session = await getServerSession(authOptions);
    const isOwnProfile = session?.user?.username === username;

    const user = await prisma.user.findUnique({
        where: { username },
        select: {
            username: true,
            displayName: true,
            avatarUrl: true,
            depCount: true,
            depTier: true,
            createdAt: true,
        },
    });

    if (!user) {
        notFound();
    }

    const joinDate = new Date(user.createdAt).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
    });

    const tier = TIER_META[user.depTier as keyof typeof TIER_META] || TIER_META.SEEDLING;

    return (
        <main className={styles.container}>
            <header className={styles.cover}>
                <Link href="/" className={styles.backLink} style={{ position: 'absolute', top: 16, left: 16, color: '#fff' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m15 18-6-6 6-6" />
                    </svg>
                </Link>
                {isOwnProfile && (
                    <Link href="/settings" style={{ position: 'absolute', top: 16, right: 16, color: '#fff', background: 'rgba(0,0,0,0.25)', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="3" />
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                        </svg>
                    </Link>
                )}
            </header>

            <section className={styles.profileContent}>
                <div className={styles.avatar}>
                    {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.displayName} className={styles.avatarImage} />
                    ) : (
                        user.displayName.charAt(0).toUpperCase()
                    )}
                </div>

                <div className={styles.info}>
                    <h1 className={styles.displayName}>{user.displayName}</h1>
                    <p className={styles.username}>@{user.username}</p>
                </div>

                <div className={styles.trustSection}>
                    <div className={styles.depCard}>
                        <span className={styles.depLabel}>Trust Score</span>
                        <span className={styles.depValue}>{user.depCount}</span>
                        <div className={`${styles.tierBadge} ${tier.style}`}>
                            {tier.label}
                        </div>
                    </div>

                    <div className={styles.statsGrid}>
                        <div className={styles.statItem}>
                            <p className={styles.statLabel}>Member Since</p>
                            <p className={styles.statValue}>{joinDate}</p>
                        </div>
                        <div className={styles.statItem}>
                            <p className={styles.statLabel}>Account Type</p>
                            <p className={styles.statValue}>Personal</p>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
