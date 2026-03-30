import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import BackButton from '@/components/BackButton';
import StoreSettingsForm from './StoreSettingsForm';
import PayoutSettingsForm from './PayoutSettingsForm';
import styles from './page.module.css';

export default async function StoreSettingsPage({ params }: { params: Promise<{ slug: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect('/login');
    }

    const { slug } = await params;

    const store = await prisma.store.findUnique({
        where: { slug },
        select: {
            id: true, slug: true, ownerId: true, name: true, description: true,
            location: true, logoUrl: true, bannerUrl: true, isActive: true,
            localDeliveryFee: true, nationwideDeliveryFee: true,
            dispatchEnabled: true, pickupAddress: true,
            feeWaiverUntil: true,
        },
    });

    if (!store) {
        redirect('/store/create');
    }

    // Security check - Only the store owner can access settings
    if (store.ownerId !== session.user.id) {
        redirect(`/store/${slug}`);
    }

    const feeWaiverDaysLeft = store.feeWaiverUntil
        ? Math.max(0, Math.ceil((new Date(store.feeWaiverUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : 0;

    return (
        <main className={styles.container}>
            <header className={styles.header}>
                <BackButton className={styles.backBtn} />
                <h1 className={styles.title}>Store Settings</h1>
                <div style={{ width: 32 }} /> {/* Spacer */}
            </header>

            <div className={styles.content}>
                {feeWaiverDaysLeft > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderRadius: '12px', background: 'rgba(var(--primary-rgb),0.08)', border: '1px solid rgba(var(--primary-rgb),0.2)', marginBottom: '20px' }}>
                        <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>🎁</span>
                        <div>
                            <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary)' }}>Free selling active</p>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                0% platform fee · {feeWaiverDaysLeft} day{feeWaiverDaysLeft !== 1 ? 's' : ''} remaining
                            </p>
                        </div>
                    </div>
                )}
                <StoreSettingsForm store={{
                    ...store,
                    localDeliveryFee: store.localDeliveryFee != null ? Number(store.localDeliveryFee) : null,
                    nationwideDeliveryFee: store.nationwideDeliveryFee != null ? Number(store.nationwideDeliveryFee) : null,
                }} />
                <PayoutSettingsForm slug={slug} />
            </div>
        </main>
    );
}
