import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import BackButton from '@/components/BackButton';
import BidsCommentsTab from './BidsCommentsTab';
import styles from './RequestDetail.module.css';

export default async function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    // Fetch KYC tier for the current user (needed for comment gate)
    let userKycTier: string = 'UNVERIFIED';
    if (userId) {
        const u = await prisma.user.findUnique({ where: { id: userId }, select: { kycTier: true } });
        userKycTier = u?.kycTier ?? 'UNVERIFIED';
    }

    const demand = await prisma.demand.findUnique({
        where: { id },
        include: {
            user: { select: { displayName: true, username: true, avatarUrl: true } },
            bids: {
                include: {
                    store: { select: { name: true, depCount: true, depTier: true } },
                    product: { select: { title: true, images: { take: 1, select: { url: true } } } }
                },
                orderBy: { createdAt: 'desc' }
            },
            comments: {
                include: { author: { select: { displayName: true, username: true, avatarUrl: true } } },
                orderBy: { createdAt: 'asc' }
            }
        }
    });

    if (!demand) notFound();

    const isPoster = userId === demand.userId;

    // Check if the current user has a store
    let userStores: { id: string; name: string }[] = [];
    if (userId) {
        userStores = await prisma.store.findMany({
            where: { ownerId: userId, isActive: true },
            select: { id: true, name: true }
        });
    }
    const hasStore = userStores.length > 0;

    // If they have a store, fetch their products for the bid dropdown
    let storeProducts: { id: string; title: string; price: number }[] = [];
    const selectedStoreId = userStores[0]?.id;

    if (selectedStoreId && !isPoster) {
        const rawProducts = await prisma.product.findMany({
            where: { storeId: selectedStoreId, inStock: true },
            select: { id: true, title: true, price: true }
        });
        storeProducts = rawProducts.map(p => ({
            id: p.id,
            title: p.title,
            price: Number(p.price)
        }));
    }

    // Serialize bids for client component
    const serializedBids = demand.bids.map(bid => ({
        id: bid.id,
        amount: Number(bid.amount),
        proposal: bid.proposal,
        isAccepted: bid.isAccepted,
        store: { name: bid.store.name },
        product: bid.product ? { title: bid.product.title } : null,
    }));

    const serializedComments = demand.comments.map(c => ({
        id: c.id,
        text: c.text,
        author: c.author,
        createdAt: c.createdAt.toISOString(),
    }));

    const timeAgo = new Date(demand.createdAt).toLocaleDateString();

    return (
        <main className={styles.container}>
            {/* Minimal back-button header — no global nav so bid/comment buttons aren't obscured */}
            <div className={styles.backHeader}>
                <BackButton className={styles.backBtn} />
                <span className={styles.backTitle}>Request</span>
            </div>

            <div className={styles.content}>

                {/* Demand Overview */}
                <div className={styles.demandHeader}>
                    <Link
                        href={demand.user.username ? `/u/${demand.user.username}` : '#'}
                        className={styles.posterInfo}
                        style={{ textDecoration: 'none' }}
                    >
                        <div className={styles.avatar}>
                            {demand.user.avatarUrl ? (
                                <img src={demand.user.avatarUrl} alt={demand.user.displayName} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                            ) : (
                                demand.user.displayName.substring(0, 2).toUpperCase()
                            )}
                        </div>
                        <div>
                            <p className={styles.posterName}>{demand.user.displayName}</p>
                            <p className={styles.meta}>Looking for &bull; {timeAgo}</p>
                        </div>
                    </Link>
                    <span className={styles.badge}>Demand</span>
                </div>

                <div className={styles.demandBody}>
                    <h1 className={styles.demandText}>{demand.text}</h1>
                    <div className={styles.budgetRow}>
                        <span className={styles.budgetLabel}>Budget:</span>
                        <strong className={styles.budgetValue}>₦{Number(demand.budget).toLocaleString()}</strong>
                    </div>
                    {demand.location && (
                        <p className={styles.location}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                            {demand.location}
                        </p>
                    )}
                </div>

                <BidsCommentsTab
                    bids={serializedBids}
                    comments={serializedComments}
                    isPoster={isPoster}
                    demandId={demand.id}
                    isActive={demand.isActive}
                    hasStore={hasStore}
                    storeId={selectedStoreId}
                    storeProducts={storeProducts}
                    canComment={userId ? userKycTier !== 'UNVERIFIED' : false}
                    isLoggedIn={!!userId}
                    apiPath={`/api/demands/${demand.id}/comments`}
                />

            </div>
        </main>
    );
}
