import React from 'react';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import styles from './page.module.css';
import Link from 'next/link';
import Image from 'next/image';
import BackButton from '@/components/BackButton';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import ProfileProductsGrid from './ProfileProductsGrid';
import ProfileMessageButton from './ProfileMessageButton';
import ProfileFollowButton from './ProfileFollowButton';

interface ProfilePageProps {
    params: Promise<{ username: string }>;
}

const TIER_LABELS: Record<string, string> = {
    SEEDLING: '🌱 Seedling',
    RISING: '⭐ Rising',
    TRUSTED: '🔥 Trusted',
    ELITE: '💎 Elite',
    LEGEND: '🏆 Legend',
};

export default async function ProfilePage({ params }: ProfilePageProps) {
    const { username } = await params;
    const session = await getServerSession(authOptions);
    const isOwnProfile = session?.user?.username === username;

    const user = (await (prisma.user as any).findFirst({
        where: { username: { equals: username, mode: 'insensitive' } },
        select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            coverUrl: true,
            bio: true,
            depCount: true,
            depTier: true,
            createdAt: true,
            stores: {
                select: { id: true, slug: true, name: true },
                take: 1,
            },
            _count: {
                select: {
                    followers: true,
                    following: true,
                }
            }
        },
    }) as any);

    if (!user) notFound();

    // Check if current user follows this profile
    let isFollowing = false;
    if (session?.user?.id && !isOwnProfile) {
        const follow = await (prisma as any).userFollow.findUnique({
            where: { followerId_followingId: { followerId: session.user.id, followingId: user.id } },
        });
        isFollowing = !!follow;
    }

    const joinDate = new Date(user.createdAt).toLocaleDateString('en-US', {
        month: 'long', year: 'numeric',
    });

    const tierLabel = TIER_LABELS[user.depTier] ?? TIER_LABELS.SEEDLING;
    const userStore = user.stores[0];

    const demands = await prisma.demand.findMany({
        where: { userId: user.id, isActive: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, text: true, budget: true, createdAt: true, _count: { select: { bids: true } } },
    });

    const storeProducts = userStore ? await prisma.product.findMany({
        where: { storeId: userStore.id, inStock: true },
        orderBy: [{ isFeatured: 'desc' }, { price: 'desc' }],
        take: 12,
        select: {
            id: true, title: true, price: true, slug: true, isFeatured: true,
            images: { take: 1, select: { url: true }, orderBy: { order: 'asc' } },
        },
    }) : [];

    // Fetch user's recent comments (replies)
    const replies = await prisma.comment.findMany({
        where: { authorId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
            id: true,
            text: true,
            createdAt: true,
            productId: true,
            demandId: true,
            product: { select: { title: true, slug: true, id: true } },
            demand: { select: { text: true, id: true } },
        },
    });

    const serializedProducts = storeProducts.map(p => ({
        id: p.id,
        title: p.title,
        price: Number(p.price),
        slug: p.slug,
        isFeatured: p.isFeatured,
        imageUrl: p.images[0]?.url ?? null,
    }));

    return (
        <main className={styles.container}>

            {/* ── Cover ─────────────────────────────────── */}
            <div className={styles.cover}>
                {user.coverUrl ? (
                    <Image src={user.coverUrl} alt="cover" fill style={{ objectFit: 'cover' }} priority sizes="680px" />
                ) : (
                    <div className={styles.coverFallback} />
                )}
                <div className={styles.coverScrim} />

                <div className={styles.topActions}>
                    <BackButton className={styles.iconBtn} />
                    <div className={styles.rightActions}>
                        <Link href="/search" className={styles.iconBtn} aria-label="Search">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                        </Link>
                        {isOwnProfile && (
                            <Link href="/settings" className={styles.iconBtn} aria-label="Settings">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="3" />
                                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                                </svg>
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Identity ──────────────────────────────── */}
            <div className={styles.identity}>
                {/* Avatar row */}
                <div className={styles.avatarRow}>
                    <div className={styles.avatar}>
                        {user.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={user.avatarUrl} alt={user.displayName} className={styles.avatarImg} />
                        ) : (
                            <span className={styles.avatarInitial}>
                                {user.displayName.charAt(0).toUpperCase()}
                            </span>
                        )}
                    </div>

                    <div className={styles.profileActions}>
                        {isOwnProfile ? (
                            <Link href="/settings" className={styles.editBtn}>Edit profile</Link>
                        ) : (
                            <>
                                <ProfileMessageButton targetUserId={user.id} />
                                <ProfileFollowButton targetUserId={user.id} initialFollowing={isFollowing} />
                            </>
                        )}
                    </div>
                </div>

                <h1 className={styles.displayName}>{user.displayName}</h1>
                <p className={styles.handle}>@{user.username}</p>
                {user.bio && <p className={styles.bio}>{user.bio}</p>}

                <div className={styles.metaRow}>
                    <span className={styles.tierChip}>{tierLabel}</span>
                    <span className={styles.metaSep}>·</span>
                    <span className={styles.metaText}>Joined {joinDate}</span>
                    <span className={styles.metaSep}>·</span>
                    <span className={styles.metaText}>{user.depCount} deps</span>
                    {userStore && (
                        <>
                            <span className={styles.metaSep}>·</span>
                            <Link href={'/store/' + userStore.slug} className={styles.storeLink}>
                                {userStore.name}
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft: 3 }}><path d="M7 17L17 7M7 7h10v10" /></svg>
                            </Link>
                        </>
                    )}
                </div>

                {/* Following / Followers counts */}
                <div className={styles.followRow}>
                    <span className={styles.followStat}>
                        <strong>{user._count.following}</strong> Following
                    </span>
                    <span className={styles.followStat}>
                        <strong>{user._count.followers}</strong> Followers
                    </span>
                </div>

                {isOwnProfile && (
                    <div className={styles.quickActions}>
                        <Link href="/orders" className={styles.quickChip}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>
                            Orders
                        </Link>
                        {userStore ? (
                            <Link href={'/store/' + userStore.slug} className={styles.quickChip + ' ' + styles.quickChipPrimary}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                                My Store
                            </Link>
                        ) : (
                            <Link href="/onboarding/store" className={styles.quickChip}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                                Open a Store
                            </Link>
                        )}
                    </div>
                )}
            </div>

            {/* ── Products ──────────────────────────────── */}
            {serializedProducts.length > 0 && userStore && (
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <div>
                            <h2 className={styles.sectionTitle}>{userStore.name}</h2>
                            {isOwnProfile && (
                                <p className={styles.sectionHint}>Tap ☆ to pin a product to your profile</p>
                            )}
                        </div>
                        <Link href={'/store/' + userStore.slug} className={styles.seeAll}>See all</Link>
                    </div>
                    <ProfileProductsGrid
                        products={serializedProducts}
                        isOwnProfile={isOwnProfile}
                    />
                </section>
            )}

            {/* ── Requests ──────────────────────────────── */}
            {demands.length > 0 && (
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>Requests</h2>
                    </div>
                    <div className={styles.requestList}>
                        {demands.map(d => (
                            <Link key={d.id} href={'/requests/' + d.id} className={styles.requestItem}>
                                <p className={styles.requestText}>{d.text}</p>
                                <div className={styles.requestMeta}>
                                    <span className={styles.requestBudget}>&#x20A6;{Number(d.budget).toLocaleString()}</span>
                                    <span className={styles.requestSub}>
                                        {d._count.bids} bid{d._count.bids !== 1 ? 's' : ''} &middot; {new Date(d.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {/* ── Replies ───────────────────────────────── */}
            {replies.length > 0 && (
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>Replies</h2>
                    </div>
                    <div className={styles.replyList}>
                        {replies.map(r => {
                            const href = r.productId
                                ? '/p/' + (r.product?.slug ?? r.productId)
                                : r.demandId
                                    ? '/requests/' + r.demandId
                                    : '#';
                            const context = r.product
                                ? 'on "' + r.product.title + '"'
                                : r.demand
                                    ? 'on a request'
                                    : '';
                            return (
                                <Link key={r.id} href={href} className={styles.replyItem}>
                                    <div className={styles.replyMeta}>
                                        <span className={styles.replyContext}>{context}</span>
                                        <span className={styles.replySub}>{new Date(r.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <p className={styles.replyText}>{r.text}</p>
                                </Link>
                            );
                        })}
                    </div>
                </section>
            )}

        </main>
    );
}
