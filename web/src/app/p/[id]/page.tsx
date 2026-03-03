import React from 'react';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import ProductVideoPlayer from './ProductVideoPlayer';

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
    const product = await prisma.product.findUnique({
        where: { id: params.id },
        include: {
            images: { orderBy: { order: 'asc' } },
            store: {
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    logoUrl: true,
                    depCount: true,
                    depTier: true,
                }
            }
        }
    });

    if (!product) notFound();

    // Increment view count (fire-and-forget)
    prisma.product.update({ where: { id: params.id }, data: { viewCount: { increment: 1 } } }).catch(() => {});

    const hasVideo = !!product.videoUrl;
    const hasImages = product.images.length > 0;

    return (
        <main style={{ minHeight: '100dvh', background: 'var(--bg-base)', paddingBottom: '80px' }}>
            <Header />

            {/* Media section */}
            <div style={{ background: '#000', width: '100%' }}>
                {hasVideo ? (
                    <ProductVideoPlayer src={product.videoUrl!} poster={product.images[0]?.url} />
                ) : hasImages ? (
                    <div style={{ width: '100%', aspectRatio: '1/1', position: 'relative' }}>
                        <Image
                            src={product.images[0].url}
                            alt={product.title}
                            fill
                            style={{ objectFit: 'contain' }}
                            sizes="100vw"
                            priority
                        />
                    </div>
                ) : (
                    <div style={{ width: '100%', aspectRatio: '1/1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect width="18" height="18" x="3" y="3" rx="2" />
                            <circle cx="9" cy="9" r="2" />
                            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                        </svg>
                    </div>
                )}
            </div>

            {/* Image strip (shown only when there's a video + multiple images, or multiple images alone) */}
            {product.images.length > 1 && (
                <div style={{ display: 'flex', gap: '8px', padding: '8px 16px', overflowX: 'auto', background: 'var(--bg-base)' }}>
                    {product.images.map((img, i) => (
                        <div key={img.id} style={{ flexShrink: 0, width: 64, height: 64, borderRadius: 8, overflow: 'hidden', position: 'relative', border: '2px solid var(--card-border)' }}>
                            <Image src={img.url} alt={`${product.title} photo ${i + 1}`} fill style={{ objectFit: 'cover' }} sizes="64px" />
                        </div>
                    ))}
                </div>
            )}

            {/* Product info */}
            <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* Title + Price */}
                <div>
                    <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' }}>
                        {product.category}
                    </p>
                    <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 12px', lineHeight: 1.3 }}>
                        {product.title}
                    </h1>
                    <p style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', margin: 0 }}>
                        ₦{Number(product.price).toLocaleString()}
                    </p>
                </div>

                {/* CTA buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {/* Phase 3: replace with real checkout */}
                    <button
                        disabled
                        style={{
                            width: '100%', padding: '16px', borderRadius: '12px',
                            background: 'linear-gradient(135deg, var(--primary) 0%, #00E676 100%)',
                            color: '#000', fontWeight: 700, fontSize: '1rem', border: 'none',
                            cursor: 'not-allowed', opacity: 0.6,
                        }}
                    >
                        Buy Now — Coming Soon
                    </button>
                    <Link
                        href={`/demand/new?q=${encodeURIComponent(product.title)}`}
                        style={{
                            display: 'block', width: '100%', padding: '14px',
                            borderRadius: '12px', border: '1.5px solid var(--card-border)',
                            background: 'var(--card-bg)', color: 'var(--text-main)',
                            fontWeight: 600, fontSize: '0.95rem', textDecoration: 'none',
                            textAlign: 'center',
                        }}
                    >
                        Make a Request
                    </Link>
                </div>

                {/* Store card */}
                <Link
                    href={`/store/${product.store.slug}`}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '14px', borderRadius: '12px',
                        background: 'var(--card-bg)', border: '1px solid var(--card-border)',
                        textDecoration: 'none',
                    }}
                >
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--bg-elevated)', border: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden', position: 'relative' }}>
                        {product.store.logoUrl
                            ? <Image src={product.store.logoUrl} alt={product.store.name} fill style={{ objectFit: 'cover' }} sizes="44px" />
                            : <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--primary)' }}>{product.store.name.charAt(0).toUpperCase()}</span>
                        }
                    </div>
                    <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem' }}>{product.store.name}</p>
                        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8rem' }}>{product.store.depCount} Deps · {product.store.depTier}</p>
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

                {/* Stats row */}
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

            <BottomNav />
        </main>
    );
}
