import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const demand = await (prisma.demand as any).findUnique({
        where: { id },
        select: {
            text: true,
            images: { take: 1, orderBy: { order: 'asc' }, select: { url: true } },
            user: { select: { displayName: true } },
        },
    });
    if (!demand) return {};
    const image = demand.images?.[0]?.url;
    const title = demand.text.length > 60 ? demand.text.slice(0, 57) + '…' : demand.text;
    const desc = `${demand.user.displayName} is looking for this on DepMi`;
    return {
        title: `${title} · DepMi`,
        description: desc,
        openGraph: {
            title,
            description: desc,
            images: image ? [{ url: image, alt: title }] : undefined,
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description: desc,
            images: image ? [image] : undefined,
        },
    };
}
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import BackButton from '@/components/BackButton';
import BidsCommentsTab from './BidsCommentsTab';
import DemandDetailActions from './DemandDetailActions';
import CloseDemandButton from './CloseDemandButton';
import ViewTracker from '@/components/ViewTracker';
import DemandMediaCarousel from './DemandMediaCarousel';
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

    const demand = (await (prisma.demand as any).findUnique({
        where: { id },
        include: {
            user: { select: { displayName: true, username: true, avatarUrl: true } },
            images: { orderBy: { order: 'asc' }, select: { url: true } },
            _count: { select: { likes: true, comments: true } },
            ...(userId ? {
                likes: { where: { userId }, select: { id: true } },
                saves: { where: { userId }, select: { id: true } },
            } : {}),
            bids: {
                orderBy: { createdAt: 'desc' },
                include: {
                    store: { select: { name: true, slug: true, depCount: true, depTier: true, owner: { select: { id: true, username: true } } } },
                    product: { select: { title: true, images: { take: 1, select: { url: true } } } }
                }
            },
            comments: {
                orderBy: { createdAt: 'desc' },
                include: {
                    author: { select: { displayName: true, username: true, avatarUrl: true } }
                }
            }
        }
    }) as any);

    if (!demand) notFound();

    // Fire-and-forget view count increment (same pattern as product detail)
    // (prisma.demand as any).update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch(() => { });

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
    const serializedBids = demand.bids.map((bid: any) => ({
        id: bid.id,
        amount: Number(bid.amount),
        proposal: bid.proposal,
        isAccepted: bid.isAccepted,
        store: { name: bid.store.name, slug: bid.store.slug },
        ownerUserId: bid.store.owner?.id ?? null,
        ownerUsername: bid.store.owner?.username ?? null,
        product: bid.product ? { title: bid.product.title } : null,
    }));

    const serializedComments = demand.comments.map((c: any) => ({
        id: c.id,
        text: c.text,
        author: c.author,
        createdAt: c.createdAt.toISOString(),
    }));

    const timeAgo = new Date(demand.createdAt).toLocaleDateString();

    return (
        <main className={styles.container}>
            <ViewTracker demandId={demand.id} />
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
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span
                            className={styles.badge}
                            style={!demand.isActive ? { background: '#333', color: '#999', borderColor: '#444' } : {}}
                        >
                            {demand.isActive ? 'Demand' : 'Closed'}
                        </span>
                        {isPoster && demand.isActive && (
                            <CloseDemandButton demandId={demand.id} />
                        )}
                        {isPoster && (
                            <Link href={`/requests/${demand.id}/edit`} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--card-bg)', color: 'var(--text-main)', border: '1px solid var(--card-border)', padding: '4px 12px', borderRadius: '16px', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                                Edit
                            </Link>
                        )}
                    </div>
                </div>

                <div className={styles.demandBody}>
                    <h1 className={styles.demandText}>{demand.text}</h1>
                    <div className={styles.budgetRow}>
                        <span className={styles.budgetLabel}>Budget:</span>
                        <strong className={styles.budgetValue}>
                            {demand.budgetMin ? `₦${Number(demand.budgetMin).toLocaleString()} – ₦${Number(demand.budget).toLocaleString()}` : `₦${Number(demand.budget).toLocaleString()}`}
                        </strong>
                    </div>
                    {demand.location && (
                        <p className={styles.location}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
                            {demand.location}
                        </p>
                    )}
                </div>

                {/* Media */}
                {(demand.videoUrl || (demand.images && demand.images.length > 0)) && (
                    <div className={styles.mediaContainer}>
                        <DemandMediaCarousel
                            images={demand.images ?? []}
                            videoUrl={demand.videoUrl}
                        />
                    </div>
                )}

                {/* Social action bar */}
                <DemandDetailActions
                    demandId={demand.id}
                    initialLiked={userId ? (demand.likes?.length ?? 0) > 0 : false}
                    initialSaved={userId ? (demand.saves?.length ?? 0) > 0 : false}
                    initialLikeCount={demand._count?.likes ?? 0}
                    commentCount={demand._count?.comments ?? 0}
                    viewCount={demand.viewCount ?? 0}
                    isLoggedIn={!!userId}
                />

                <div className={styles.divider} />

                <BidsCommentsTab
                    bids={serializedBids}
                    comments={serializedComments}
                    isPoster={isPoster}
                    demandId={demand.id}
                    isActive={demand.isActive}
                    hasStore={hasStore}
                    storeId={selectedStoreId}
                    storeProducts={storeProducts}
                    canComment={!!userId}
                    isLoggedIn={!!userId}
                    sessionUserId={userId ?? undefined}
                    apiPath={`/api/demands/${demand.id}/comments`}
                />

            </div>
        </main>
    );
}
