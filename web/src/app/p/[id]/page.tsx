import React from 'react';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import ProductVideoPlayer from './ProductVideoPlayer';
import ProductImageGallery from './ProductImageGallery';
import EnquireButton from './EnquireButton';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import CommentSection from '@/app/requests/[id]/CommentSection';
import ProductReviews from './ProductReviews';
import BackButton from '@/components/BackButton';
import styles from './page.module.css';

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    let userKycTier: string = 'UNVERIFIED';
    if (userId) {
        const u = await prisma.user.findUnique({ where: { id: userId }, select: { kycTier: true } });
        userKycTier = u?.kycTier ?? 'UNVERIFIED';
    }

    const product = await prisma.product.findFirst({
        where: { OR: [{ slug: id }, { id }] },
        include: {
            images: { orderBy: { order: 'asc' } },
            store: {
                select: { id: true, name: true, slug: true, logoUrl: true, depCount: true, depTier: true, ownerId: true, rating: true, reviewCount: true }
            },
            comments: {
                include: { author: { select: { displayName: true, username: true, avatarUrl: true } } },
                orderBy: { createdAt: 'asc' }
            }
        }
    });

    if (!product) notFound();

    prisma.product.update({ where: { id: product.id }, data: { viewCount: { increment: 1 } } }).catch(() => { });

    const serializedComments = product.comments.map(c => ({
        id: c.id,
        text: c.text,
        author: c.author,
        createdAt: c.createdAt.toISOString(),
    }));

    const hasVideo = !!product.videoUrl;

    return (
        <main className={styles.page}>
            <Header />

            <div className={styles.wrapper}>
                <div className={styles.twoCol}>
                    {/* Left / top: media */}
                    <div className={styles.mediaCol}>
                        <div className={styles.backBtnWrap}>
                            <BackButton />
                        </div>
                        {hasVideo ? (
                            <ProductVideoPlayer src={product.videoUrl!} poster={product.images[0]?.url} />
                        ) : (
                            <ProductImageGallery images={product.images} title={product.title} />
                        )}
                        {hasVideo && product.images.length > 0 && (
                            <ProductImageGallery images={product.images} title={product.title} />
                        )}
                    </div>

                    {/* Right / below: info */}
                    <div className={styles.infoCol}>
                        {/* Title + Price */}
                        <div>
                            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' }}>
                                {product.category}
                            </p>
                            <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 12px', lineHeight: 1.3 }}>
                                {product.title}
                            </h1>
                            <p style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', margin: 0 }}>
                                &#x20A6;{Number(product.price).toLocaleString()}
                            </p>
                        </div>

                        {/* CTAs */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {product.isPortfolioItem ? (
                                <EnquireButton productId={product.id} targetUserId={product.store.ownerId} />
                            ) : product.inStock ? (
                                <Link
                                    href={'/checkout/' + product.id}
                                    style={{ display: 'block', width: '100%', padding: '16px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--primary) 0%, #00E676 100%)', color: '#000', fontWeight: 700, fontSize: '1rem', textDecoration: 'none', textAlign: 'center' }}
                                >
                                    Buy via Escrow
                                </Link>
                            ) : (
                                <Link
                                    href={'/demand/new?q=' + encodeURIComponent(product.title)}
                                    style={{ display: 'block', width: '100%', padding: '16px', borderRadius: '12px', background: 'var(--card-bg)', color: 'var(--text-muted)', fontWeight: 700, fontSize: '1rem', textDecoration: 'none', textAlign: 'center', border: '1.5px solid var(--card-border)' }}
                                >
                                    Out of Stock &#8212; Request It
                                </Link>
                            )}

                            {!product.isPortfolioItem && product.inStock && (
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <EnquireButton
                                        productId={product.id}
                                        targetUserId={product.store.ownerId}
                                        text="Message Seller"
                                        style={{ width: '50%', padding: '14px', borderRadius: '12px', background: 'var(--card-bg)', color: 'var(--text-main)', border: '1.5px solid var(--card-border)', fontWeight: 600, fontSize: '0.95rem' }}
                                    />
                                    <Link
                                        href={'/demand/new?q=' + encodeURIComponent(product.title)}
                                        style={{ display: 'block', width: '50%', padding: '14px', borderRadius: '12px', border: '1.5px solid var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-main)', fontWeight: 600, fontSize: '0.95rem', textDecoration: 'none', textAlign: 'center', boxSizing: 'border-box' }}
                                    >
                                        Make a Request
                                    </Link>
                                </div>
                            )}
                        </div>

                        {/* Store card */}
                        <Link
                            href={'/store/' + product.store.slug}
                            style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', borderRadius: '12px', background: 'var(--card-bg)', border: '1px solid var(--card-border)', textDecoration: 'none' }}
                        >
                            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--bg-elevated)', border: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden', position: 'relative' }}>
                                {product.store.logoUrl
                                    ? <Image src={product.store.logoUrl} alt={product.store.name} fill style={{ objectFit: 'cover' }} sizes="44px" />
                                    : <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--primary)' }}>{product.store.name.charAt(0).toUpperCase()}</span>
                                }
                            </div>
                            <div style={{ flex: 1 }}>
                                <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem' }}>{product.store.name}</p>
                                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                    {product.store.reviewCount > 0
                                        ? <><svg style={{ display: 'inline', verticalAlign: 'middle', marginRight: '2px', marginBottom: '1px' }} width="11" height="11" viewBox="0 0 24 24" fill="#FFD700" stroke="#FFD700" strokeWidth="1"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" /></svg>{Number(product.store.rating).toFixed(1)} &middot; </>
                                        : null
                                    }
                                    {product.store.depCount} Deps &middot; {product.store.depTier}
                                </p>
                            </div>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)' }}>
                                <path d="m9 18 6-6-6-6" />
                            </svg>
                        </Link>

                        {/* Description */}
                        {product.description && (
                            <div style={{ padding: '16px', borderRadius: '12px', background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                                <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>About this product</p>
                                <p style={{ margin: 0, color: 'var(--text-main)', fontSize: '0.9rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                                    {product.description}
                                </p>
                            </div>
                        )}

                        {/* Stats */}
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <div style={{ flex: 1, padding: '12px', borderRadius: '10px', background: 'var(--card-bg)', border: '1px solid var(--card-border)', textAlign: 'center' }}>
                                <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>{product.viewCount + 1}</p>
                                <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)' }}>Views</p>
                            </div>
                            <div style={{ flex: 1, padding: '12px', borderRadius: '10px', background: 'var(--card-bg)', border: '1px solid var(--card-border)', textAlign: 'center' }}>
                                <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: product.inStock ? 'var(--primary)' : 'var(--error)' }}>
                                    {product.inStock ? 'In Stock' : 'Out of Stock'}
                                </p>
                                <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)' }}>Availability</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Reviews — full width below both columns */}
                <div className={styles.divider} />
                <div className={styles.fullWidthSection}>
                    <ProductReviews productId={product.id} />
                </div>

                {/* Comments — full width below both columns */}
                <div className={styles.divider} />
                <div className={styles.fullWidthSection}>
                    <CommentSection
                        apiPath={'/api/products/' + product.id + '/comments'}
                        initialComments={serializedComments}
                        canComment={!!userId}
                        isLoggedIn={!!userId}
                    />
                </div>
            </div>

            <BottomNav />
        </main>
    );
}
