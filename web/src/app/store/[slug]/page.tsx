import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import styles from './page.module.css';
import Link from 'next/link';
import Image from 'next/image';
import { getServerSession } from 'next-auth';
import StoreBackButton from './StoreBackButton';
import { authOptions } from '@/lib/auth';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const store = await prisma.store.findUnique({
        where: { slug },
        select: { name: true, description: true, logoUrl: true, location: true, depCount: true, rating: true, reviewCount: true },
    });
    if (!store) return {};

    const locationSuffix = store.location ? ` — ${store.location}` : '';
    const title = `${store.name}${locationSuffix} · DepMi`;
    const descParts: string[] = [store.description || `Shop ${store.name} on DepMi`];
    if (store.location) descParts.push(`Based in ${store.location}.`);
    if (store.depCount > 0) descParts.push(`${store.depCount} deps earned.`);
    const desc = descParts.join(' ');

    return {
        title,
        description: desc,
        alternates: { canonical: `https://depmi.com/store/${slug}` },
        openGraph: {
            title,
            description: desc,
            images: store.logoUrl ? [{ url: store.logoUrl, alt: store.name }] : undefined,
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description: desc,
            images: store.logoUrl ? [store.logoUrl] : undefined,
        },
    };
}
import FollowButton from '@/components/FollowButton';
import StoreTabBar from './StoreTabBar';
import StoreShareButton from './StoreShareButton';
import ViewTracker from '@/components/ViewTracker';

interface StorePageProps {
    params: Promise<{ slug: string }>;
}

const TIER_TEXT: Record<string, string> = {
    SEEDLING: 'Seedling',
    RISING: 'Rising',
    TRUSTED: 'Trusted',
    ELITE: 'Elite',
    LEGEND: 'Legend',
};

function TierIcon({ tier }: { tier: string }) {
    switch (tier) {
        case 'SEEDLING':
            return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22V12"/><path d="M5 3a7 7 0 0 0 7 7 7 7 0 0 0 7-7"/><path d="M5 3h14"/></svg>;
        case 'RISING':
            return <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="0.5"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>;
        case 'TRUSTED':
            return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
        case 'ELITE':
            return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"/><path d="m7 10 3 3 7-7"/></svg>;
        case 'LEGEND':
            return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>;
        default:
            return null;
    }
}

function StarRating({ rating, count }: { rating: number; count: number }) {
    const full = Math.floor(rating);
    const half = rating - full >= 0.5;
    const empty = 5 - full - (half ? 1 : 0);
    const stars = [
        ...Array(full).fill('full'),
        ...(half ? ['half'] : []),
        ...Array(empty).fill('empty'),
    ];
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ display: 'flex', gap: '1px' }}>
                {stars.map((t, i) => (
                    <svg key={i} width="14" height="14" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                        {t === 'full' && <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" fill="#FFD700" stroke="#FFD700" strokeWidth="1" />}
                        {t === 'half' && <>
                            <defs><linearGradient id="hg"><stop offset="50%" stopColor="#FFD700" /><stop offset="50%" stopColor="transparent" /></linearGradient></defs>
                            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" fill="url(#hg)" stroke="#FFD700" strokeWidth="1" />
                        </>}
                        {t === 'empty' && <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" fill="transparent" stroke="#FFD700" strokeWidth="1" />}
                    </svg>
                ))}
            </span>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>{rating.toFixed(1)}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({count} review{count !== 1 ? 's' : ''})</span>
        </div>
    );
}

export default async function StorefrontPage({ params }: StorePageProps) {
    const { slug } = await params;
    const session = await getServerSession(authOptions);

    const currentUserId = session?.user?.id;
    const store = await (prisma.store as any).findUnique({
        where: { slug },
        include: {
            owner: { select: { kycTier: true, username: true, displayName: true, id: true } },
            _count: { select: { followers: true } },
            products: {
                orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
                include: {
                    images: true,
                    _count: { select: { likes: true, saves: true, comments: true } },
                    ...(currentUserId ? {
                        likes: { where: { userId: currentUserId }, select: { id: true } },
                        saves: { where: { userId: currentUserId }, select: { id: true } },
                    } : {}),
                },
            },
        },
    }) as any;

    if (!store) notFound();

    const isOwner = currentUserId === store.ownerId;

    // Check if the viewer already has their own store (to redirect instead of creating)
    const viewerStore = (!isOwner && currentUserId)
        ? await prisma.store.findFirst({ where: { ownerId: currentUserId }, select: { slug: true } })
        : null;

    const visibleProducts = isOwner
        ? store.products
        : store.products.filter((p: any) => p.inStock || p.isPortfolioItem);

    const serializedProducts = visibleProducts.map((p: any) => ({
        id: p.id,
        title: p.title,
        price: Number(p.price),
        slug: p.slug ?? null,
        isFeatured: p.isFeatured,
        inStock: p.inStock,
        isPortfolioItem: p.isPortfolioItem,
        imageUrl: p.images?.[0]?.url ?? null,
        currency: p.currency ?? '₦',
        likeCount: p._count?.likes ?? 0,
        saveCount: p._count?.saves ?? 0,
        commentCount: p._count?.comments ?? 0,
        viewCount: p.viewCount ?? 0,
        isLiked: currentUserId ? (p.likes?.length ?? 0) > 0 : false,
        isSaved: currentUserId ? (p.saves?.length ?? 0) > 0 : false,
    }));

    const tierLabel = TIER_TEXT[store.depTier] ?? TIER_TEXT.SEEDLING;
    const isPremium = store.owner.kycTier === 'TIER_3' || store.owner.kycTier === 'BUSINESS';
    const isVerified = isBvnVerified(store.owner.kycTier);

    const storeJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Store',
        name: store.name,
        ...(store.description && { description: store.description }),
        url: `https://depmi.com/store/${store.slug}`,
        ...(store.logoUrl && { logo: store.logoUrl, image: store.logoUrl }),
        ...(store.location && {
            address: {
                '@type': 'PostalAddress',
                addressLocality: store.location,
                addressCountry: 'NG',
            },
        }),
        ...(store.reviewCount > 0 && {
            aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: Number(store.rating).toFixed(1),
                reviewCount: store.reviewCount,
            },
        }),
    };

    return (
        <main className={styles.container}>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(storeJsonLd) }} />
            <ViewTracker storeId={store.id} />

            {/* ── Cover ─────────────────────────────────── */}
            <div className={styles.cover}>
                {store.bannerUrl ? (
                    <Image src={store.bannerUrl} alt={store.name} fill style={{ objectFit: 'cover' }} sizes="480px" priority />
                ) : (
                    <div className={styles.coverFallback} />
                )}
                <div className={styles.coverScrim} />
                <div className={styles.topActions}>
                    <StoreBackButton />
                    <div className={styles.rightActions}>
                        <StoreShareButton storeName={store.name} storeSlug={store.slug} location={store.location} />
                        <Link href={`/search?store=${store.slug}`} className={styles.iconBtn} aria-label="Search">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                        </Link>
                        {isOwner && (
                            <Link href={`/store/${store.slug}/analytics`} className={styles.iconBtn} aria-label="Analytics">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                            </Link>
                        )}
                        {isOwner && (
                            <Link href={`/store/${store.slug}/settings`} className={styles.iconBtn} aria-label="Settings">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Identity ──────────────────────────────── */}
            <div className={styles.identity}>
                <div className={styles.identityActions}>
                    {isOwner && (
                        <>
                            <Link href={`/store/${store.slug}/products/new`} className={styles.iconBtn} aria-label="Add Product">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
                            </Link>
                            <Link href={`/store/${store.slug}/ai-import`} className={styles.iconBtn} aria-label="AI Import">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10" /><path d="m22 2-10 10" /><path d="m17 2 5 5-5 5" /></svg>
                            </Link>
                        </>
                    )}
                </div>
                {/* Logo row */}
                <div className={styles.logoRow}>
                    <div className={styles.logo}>
                        {store.logoUrl ? (
                            <Image src={store.logoUrl} alt={store.name} fill style={{ objectFit: 'cover' }} sizes="80px" />
                        ) : (
                            <span className={styles.logoInitial}>{store.name.charAt(0).toUpperCase()}</span>
                        )}
                    </div>
                </div>

                {/* Store name + verification */}
                <h1 className={styles.storeName}>
                    {store.name}
                    {isPremium ? (
                        <span className={styles.premiumBadge} title="DepMi Certified">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2l2.67 2.67L18.41 4l.59 3.76L22 9.5l-2.07 3.14L22 15.78l-3.03 1.74-.59 3.76-3.74-.67L12 23l-2.67-2.67-3.74.67-.59-3.76L2 15.78l2.07-3.14L2 9.5l3.03-1.74.59-3.76 3.74.67L12 2z" />
                            </svg>
                        </span>
                    ) : isVerified ? (
                        <span className={styles.verifiedBadge} title="Verified">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                            </svg>
                        </span>
                    ) : null}
                </h1>

                <p className={styles.handle}>@{store.slug}</p>

                <Link href={`/${store.owner.username}`} className={styles.ownerLink}>
                    <span>Owned by <strong>{store.owner.displayName || store.owner.username}</strong></span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M7 17L17 7M7 7h10v10" /></svg>
                </Link>

                {store.location && (
                    <p className={styles.location}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
                        {store.location}
                    </p>
                )}

                {store.description && (
                    <p className={styles.description}>{store.description}</p>
                )}

                {/* Meta row: tier + dispatch + followers */}
                <div className={styles.metaRow}>
                    <span className={styles.tierChip} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <TierIcon tier={store.depTier} />
                        {tierLabel}
                    </span>
                    {store.dispatchEnabled && store.pickupAddress && (
                        <span className={styles.dispatchChip} title="This store ships via DepMi Dispatch — tracked delivery nationwide">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="1" /><path d="M16 8h4l3 5v4h-7V8z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>
                            DepMi Dispatch
                        </span>
                    )}
                    <span className={styles.metaSep}>·</span>
                    <span className={styles.metaText}>{store._count.followers} follower{store._count.followers !== 1 ? 's' : ''}</span>
                </div>

                {/* Star rating */}
                {store.reviewCount > 0 ? (
                    <div style={{ marginTop: '6px' }}>
                        <StarRating rating={Number(store.rating)} count={store.reviewCount} />
                    </div>
                ) : (
                    <p style={{ margin: '6px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>No reviews yet</p>
                )}

                {/* Follow button for non-owners */}
                {!isOwner && (
                    <div className={styles.followWrap}>
                        <FollowButton storeSlug={store.slug} initialFollowersCount={store._count.followers} />
                    </div>
                )}

                {/* Owner inventory notice */}
                {isOwner && store.products.length > visibleProducts.length && (
                    <p className={styles.inventoryNote}>
                        Showing all {store.products.length} products. Visitors see {visibleProducts.length} in-stock items.
                    </p>
                )}
            </div>

            {/* ── Tabbed content (Products / Updates) ───── */}
            <StoreTabBar
                products={serializedProducts}
                storeId={store.id}
                storeSlug={store.slug}
                sessionUserId={currentUserId}
                isOwner={isOwner}
            />

            {/* ── Powered by DepMi — seller acquisition footer ── */}
            {!isOwner && (
                <div style={{ textAlign: 'center', padding: '24px 16px 36px', borderTop: '1px solid var(--card-border)', marginTop: '8px' }}>
                    <p style={{ margin: '0 0 10px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Secure checkout · Escrow protection · Tracked delivery
                    </p>
                    <Link
                        href={viewerStore ? `/store/${viewerStore.slug}` : '/store/create'}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary)', textDecoration: 'none', padding: '8px 16px', borderRadius: '999px', border: '1px solid rgba(5,150,105,0.25)', background: 'rgba(5,150,105,0.06)' }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9,22 9,12 15,12 15,22" /></svg>
                        {viewerStore ? 'Go to your store' : 'Open your own store on DepMi — free'}
                    </Link>
                    <p style={{ margin: '10px 0 0', fontSize: '0.72rem', color: 'var(--text-muted)', opacity: 0.6 }}>
                        Powered by <Link href="/" style={{ color: 'inherit', textDecoration: 'none', fontWeight: 600 }}>DepMi</Link>
                    </p>
                </div>
            )}
        </main>
    );
}

function isBvnVerified(kycTier: string): boolean {
    return ['TIER_2', 'TIER_3', 'BUSINESS'].includes(kycTier);
}
