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
        where: { slug }
    });

    if (!store) {
        redirect('/store/create');
    }

    // Security check - Only the store owner can access settings
    if (store.ownerId !== session.user.id) {
        redirect(`/store/${slug}`);
    }

    return (
        <main className={styles.container}>
            <header className={styles.header}>
                <BackButton className={styles.backBtn} />
                <h1 className={styles.title}>Store Settings</h1>
                <div style={{ width: 32 }} /> {/* Spacer */}
            </header>

            <div className={styles.content}>
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
