import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import styles from './page.module.css';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import ProductCard from '@/components/ProductCard';
import DemandCard from '@/components/DemandCard';
import EmptyState from '@/components/EmptyState';

export default async function BookmarksPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) redirect('/');

    const userId = session.user.id;

    const [savedProducts, savedDemands] = await Promise.all([
        prisma.savedProduct.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            include: {
                product: {
                    include: {
                        store: {
                            select: {
                                name: true, slug: true, depCount: true, depTier: true,
                                ownerId: true, owner: { select: { username: true } }
                            }
                        },
                        images: true,
                        _count: { select: { likes: true, saves: true, comments: true } },
                        likes: { where: { userId }, select: { id: true } },
                    }
                }
            }
        }),
        prisma.savedDemand.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            include: {
                demand: {
                    include: {
                        user: { select: { displayName: true, username: true, avatarUrl: true } },
                        _count: { select: { bids: true, comments: true, likes: true } },
                        images: { orderBy: { order: 'asc' }, take: 3, select: { url: true } },
                        likes: { where: { userId }, select: { id: true } },
                    }
                }
            }
        }),
    ]);

    const colors = ['#1A1D1F', '#0984E3', '#00B894', '#D63031', '#6C5CE7', '#E17055'];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const productItems = savedProducts.map((s: any) => {
        const p = s.product;
        if (!p) return null;
        const colorIndex = p.store.name.length % colors.length;
        return {
            store: p.store.name,
            storeSlug: p.store.slug,
            storeInitial: p.store.name.charAt(0).toUpperCase(),
            storeColor: colors[colorIndex],
            deps: p.store.depCount,
            depTier: p.store.depTier.toLowerCase(),
            title: p.title,
            price: `₦${Number(p.price).toLocaleString()}`,
            location: 'Nationwide',
            image: p.images && p.images.length > 0 ? p.images[0].url : '',
            viewers: p.viewCount,
            id: p.id,
            ownerId: p.store.ownerId,
            ownerUsername: p.store.owner.username,
            likeCount: p._count.likes,
            saveCount: p._count.saves,
            commentCount: p._count.comments,
            isLiked: p.likes && p.likes.length > 0,
            isSaved: true,
            stock: p.stock,
            inStock: p.inStock,
        };
    }).filter(Boolean);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const demandItems = savedDemands.map((s: any) => {
        const d = s.demand;
        if (!d) return null;
        return {
            id: d.id,
            username: d.user.username ?? undefined,
            user: d.user.displayName,
            initials: (d.user.displayName || d.user.username || '??').substring(0, 2).toUpperCase(),
            avatarUrl: d.user.avatarUrl ?? null,
            timeAgo: new Date(d.createdAt).toLocaleDateString(),
            text: d.text || '',
            budget: `₦${Number(d.budget).toLocaleString()}`,
            budgetMin: d.budgetMin ? `₦${Number(d.budgetMin).toLocaleString()}` : null,
            bids: d._count.bids,
            commentCount: d._count.comments,
            likeCount: d._count.likes,
            viewCount: d.viewCount,
            isLiked: d.likes && d.likes.length > 0,
            isSaved: true,
            location: d.location ?? null,
            images: d.images.map((img: { url: string }) => img.url),
        };
    }).filter(Boolean);

    const isEmpty = productItems.length === 0 && demandItems.length === 0;

    return (
        <main className={styles.main}>
            <Header />
            <div className={styles.content}>
                <h1 className={styles.pageTitle}>Bookmarks</h1>

                {isEmpty ? (
                    <EmptyState
                        title="No bookmarks yet"
                        description="Tap the bookmark icon on any product or request to save it here."
                        actionLabel="Explore Feed"
                        actionHref="/"
                    />
                ) : (
                    <>
                        {productItems.length > 0 && (
                            <section className={styles.section}>
                                <h2 className={styles.sectionTitle}>Products ({productItems.length})</h2>
                                <div className={styles.feed}>
                                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                    {productItems.map((p: any, i: number) => (
                                        <ProductCard key={p.id} data={p} index={i} />
                                    ))}
                                </div>
                            </section>
                        )}

                        {demandItems.length > 0 && (
                            <section className={styles.section}>
                                <h2 className={styles.sectionTitle}>Requests ({demandItems.length})</h2>
                                <div className={styles.feed}>
                                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                    {demandItems.map((d: any, i: number) => (
                                        <DemandCard key={d.id} data={d} index={i} />
                                    ))}
                                </div>
                            </section>
                        )}
                    </>
                )}
            </div>
            <BottomNav />
        </main>
    );
}
