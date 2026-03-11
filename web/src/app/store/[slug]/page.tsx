import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import styles from './page.module.css';
import Link from 'next/link';
import Image from 'next/image';
import { getServerSession } from 'next-auth';
import StoreBackButton from './StoreBackButton';
import { authOptions } from '@/lib/auth';
import EmptyState from '@/components/EmptyState';
import FollowButton from '@/components/FollowButton';
import StoreFeed from './StoreFeed';

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

    const store = await prisma.store.findUnique({
        where: { slug },
        include: {
            owner: { select: { kycTier: true, username: true, displayName: true } },
            _count: { select: { followers: true } },
            products: {
                orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
                include: { images: true },
            },
        },
    });

    if (!store) notFound();

    const isOwner = session?.user?.id === store.ownerId;
    const visibleProducts = isOwner
        ? store.products
        : store.products.filter(p => p.inStock || p.isPortfolioItem);

    const tierLabel = TIER_TEXT[store.depTier] ?? TIER_TEXT.SEEDLING;
    const isPremium = store.owner.kycTier === 'TIER_3' || store.owner.kycTier === 'BUSINESS';
    const isVerified = isBvnVerified(store.owner.kycTier);

    return (
        <main className={styles.container}>

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
                        <Link href={`/search?store=${store.slug}`} className={styles.iconBtn} aria-label="Search">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                        </Link>
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

                <Link href={`/u/${store.owner.username}`} className={styles.ownerLink}>
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

                {/* Meta row: tier + followers */}
                <div className={styles.metaRow}>
                    <span className={styles.tierChip} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <TierIcon tier={store.depTier} />
                        {tierLabel}
                    </span>
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

            {/* ── Products ──────────────────────────────── */}
            <section className={styles.productsSection} style={{ marginBottom: '8px' }}>
                {visibleProducts.length === 0 ? (
                    <EmptyState
                        title="No products listed yet"
                        description={isOwner
                            ? "Your store is ready — add your first product to start selling."
                            : "This store hasn't added any products yet. Check back soon!"}
                        actionLabel={isOwner ? "Add Your First Product" : undefined}
                        actionHref={isOwner ? `/store/${store.slug}/products/new` : undefined}
                    />
                ) : (
                    <div className={styles.productsGrid}>
                        {visibleProducts.map(product => {
                            const cellClass = `${styles.productCell} ${(!product.inStock && !product.isPortfolioItem) ? styles.productCellDim : ''}`;
                            const cellContent = (
                                <>
                                    <div className={styles.productImg}>
                                        {product.images?.[0] ? (
                                            <Image
                                                src={product.images[0].url}
                                                alt={product.title}
                                                fill
                                                style={{ objectFit: 'cover' }}
                                                sizes="(max-width: 480px) 50vw, 240px"
                                            />
                                        ) : (
                                            <div className={styles.productImgPlaceholder}>
                                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect width="18" height="18" x="3" y="3" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg>
                                            </div>
                                        )}

                                        {/* Badges */}
                                        {product.isFeatured && (
                                            <span className={styles.featuredBadge}>★</span>
                                        )}
                                        {product.isPortfolioItem && (
                                            <span className={styles.portfolioBadge}>Portfolio</span>
                                        )}
                                        {isOwner && !product.inStock && !product.isPortfolioItem && (
                                            <span className={styles.outOfStockBadge}>Out of stock</span>
                                        )}
                                    </div>

                                    <div className={styles.productInfo}>
                                        <p className={styles.productTitle}>{product.title}</p>
                                        {product.isPortfolioItem ? (
                                            <p className={styles.productEnquire}>Enquire</p>
                                        ) : (
                                            <p className={`${styles.productPrice} ${!product.inStock ? styles.productPriceDim : ''}`}>
                                                {product.currency}{Number(product.price).toLocaleString()}
                                            </p>
                                        )}
                                    </div>
                                </>
                            );

                            return isOwner ? (
                                <div key={product.id} className={cellClass}>
                                    <Link href={`/p/${product.slug ?? product.id}`} style={{ display: 'contents' }}>
                                        {cellContent}
                                    </Link>
                                    <Link
                                        href={`/store/${store.slug}/products/${product.id}/edit`}
                                        className={styles.productEditBtn}
                                    >
                                        ✏ Edit
                                    </Link>
                                </div>
                            ) : (
                                <Link key={product.id} href={`/p/${product.slug ?? product.id}`} className={cellClass}>
                                    {cellContent}
                                </Link>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* ── Store Feed (Posts / Announcements) ────── */}
            <StoreFeed
                storeId={store.id}
                storeSlug={store.slug}
                sessionUserId={session?.user?.id}
                isOwner={isOwner}
            />
        </main>
    );
}

function isBvnVerified(kycTier: string): boolean {
    return ['TIER_2', 'TIER_3', 'BUSINESS'].includes(kycTier);
}
