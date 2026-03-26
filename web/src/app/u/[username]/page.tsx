import React from 'react';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
    const { username } = await params;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = await (prisma.user as any).findFirst({
        where: { username: { equals: username, mode: 'insensitive' } },
        select: { displayName: true, username: true, bio: true, avatarUrl: true },
    });
    if (!user) return {};
    const desc = user.bio || `Follow ${user.displayName} on DepMi`;
    return {
        title: `${user.displayName} (@${user.username}) · DepMi`,
        description: desc,
        openGraph: {
            title: `${user.displayName} (@${user.username})`,
            description: desc,
            images: user.avatarUrl ? [{ url: user.avatarUrl, alt: user.displayName }] : undefined,
        },
        twitter: {
            card: 'summary_large_image',
            title: `${user.displayName} (@${user.username})`,
            description: desc,
            images: user.avatarUrl ? [user.avatarUrl] : undefined,
        },
    };
}
import styles from './page.module.css';
import Link from 'next/link';
import Image from 'next/image';
import BackButton from '@/components/BackButton';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import ProfileMessageButton from './ProfileMessageButton';
import ProfileFollowButton from './ProfileFollowButton';
import ProfileTabs from './ProfileTabs';
import ShareButton from '@/components/ShareButton';
import QRCodeButton from '@/components/QRCodeButton';

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
                orderBy: { createdAt: 'asc' },
            },
            _count: {
                select: {
                    followers: true,
                    following: true,
                }
            }
        },
    }) as any);

    if (!user) {
        const store = await prisma.store.findFirst({
            where: { slug: { equals: username, mode: 'insensitive' } },
            select: { slug: true },
        });
        if (store) redirect(`/store/${store.slug}`);
        notFound();
    }

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

    const currentUserId = session?.user?.id;
    const demands = await (prisma.demand as any).findMany({
        where: { userId: user.id, isActive: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
            user: { select: { displayName: true, username: true, avatarUrl: true } },
            images: { orderBy: { order: 'asc' }, take: 3, select: { url: true } },
            _count: { select: { bids: true, comments: true, likes: true } },
            ...(currentUserId ? {
                likes: { where: { userId: currentUserId }, select: { id: true } },
                saves: { where: { userId: currentUserId }, select: { id: true } },
            } : {}),
        },
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
                        <ShareButton
                            url={`https://depmi.com/${user.username}`}
                            title={user.displayName}
                            text={`Check out @${user.username} on DepMi`}
                        />
                        <QRCodeButton
                            url={`https://depmi.com/${user.username}`}
                            label={`@${user.username}`}
                        />
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
                    {user.stores.map((s: { id: string; slug: string; name: string }) => (
                        <React.Fragment key={s.id}>
                            <span className={styles.metaSep}>·</span>
                            <Link href={'/store/' + s.slug} className={styles.storeLink}>
                                {s.name}
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft: 3 }}><path d="M7 17L17 7M7 7h10v10" /></svg>
                            </Link>
                        </React.Fragment>
                    ))}
                </div>

                {/* Following / Followers counts */}
                <div className={styles.followRow}>
                    <Link href={`/u/${username}/following`} className={styles.followStat}>
                        <strong>{user._count.following}</strong> Following
                    </Link>
                    <Link href={`/u/${username}/followers`} className={styles.followStat}>
                        <strong>{user._count.followers}</strong> Followers
                    </Link>
                </div>

                {isOwnProfile && (
                    <div className={styles.quickActions}>
                        <Link href="/orders" className={styles.quickChip}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>
                            Orders
                        </Link>
                        {user.stores.length > 0 ? (
                            user.stores.map((s: { id: string; slug: string; name: string }) => (
                                <Link key={s.id} href={'/store/' + s.slug} className={styles.quickChip + ' ' + styles.quickChipPrimary}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                                    {s.name}
                                </Link>
                            ))
                        ) : (
                            <Link href="/onboarding/store" className={styles.quickChip}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                                Open a Store
                            </Link>
                        )}
                    </div>
                )}
            </div>

            {/* ── Tabbed content (Posts / Requests / Replies) ── */}
            <ProfileTabs
                products={serializedProducts}
                demands={demands.map((d: any) => {
                    const iso = d.createdAt.toISOString();
                    const diff = Date.now() - new Date(iso).getTime();
                    const m = Math.floor(diff / 60000);
                    const timeAgo = m < 1 ? 'just now' : m < 60 ? `${m}m` : m < 1440 ? `${Math.floor(m / 60)}h` : `${Math.floor(m / 1440)}d`;
                    return {
                        id: d.id,
                        username: d.user.username ?? undefined,
                        user: d.user.displayName,
                        initials: d.user.displayName.substring(0, 2).toUpperCase(),
                        avatarUrl: d.user.avatarUrl ?? null,
                        timeAgo,
                        text: d.text,
                        budget: `${d.currency || '₦'}${Number(d.budget).toLocaleString()}`,
                        budgetMin: d.budgetMin ? `${d.currency || '₦'}${Number(d.budgetMin).toLocaleString()}` : null,
                        bids: d._count.bids,
                        location: d.location ?? null,
                        images: (d.images ?? []).map((img: any) => img.url),
                        videoUrl: d.videoUrl ?? null,
                        likeCount: d._count.likes,
                        commentCount: d._count.comments,
                        viewCount: d.viewCount ?? 0,
                        isLiked: currentUserId ? (d.likes?.length ?? 0) > 0 : false,
                        isSaved: currentUserId ? (d.saves?.length ?? 0) > 0 : false,
                    };
                })}
                replies={replies.map(r => ({
                    ...r,
                    createdAt: r.createdAt.toISOString(),
                }))}
                isOwnProfile={isOwnProfile}
                userStore={userStore ?? null}
            />

        </main>
    );
}
