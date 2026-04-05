'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import styles from './StoreTabBar.module.css';
import StoreFeed from './StoreFeed';
import EmptyState from '@/components/EmptyState';
import SellerChecklist from './SellerChecklist';

export type SerializedStoreProduct = {
    id: string;
    title: string;
    price: number;
    slug: string | null;
    isFeatured: boolean;
    inStock: boolean;
    isPortfolioItem: boolean;
    imageUrl: string | null;
    currency: string;
    likeCount: number;
    saveCount: number;
    commentCount: number;
    viewCount: number;
    isLiked: boolean;
    isSaved: boolean;
};

interface StoreTabBarProps {
    products: SerializedStoreProduct[];
    storeId: string;
    storeSlug: string;
    sessionUserId?: string;
    isOwner: boolean;
}

type TabKey = 'products' | 'updates';
type StoreSortKey = 'default' | 'price_asc' | 'price_desc';

const STORE_SORT_OPTIONS: { label: string; value: StoreSortKey; icon: string }[] = [
    { label: 'Featured', value: 'default', icon: '★' },
    { label: 'Price ↑', value: 'price_asc', icon: '↑' },
    { label: 'Price ↓', value: 'price_desc', icon: '↓' },
];

// ── Individual card ──────────────────────────────────────────────────────────

function StoreProductCard({
    product: initial,
    storeSlug,
    isOwner,
    sessionUserId,
}: {
    product: SerializedStoreProduct;
    storeSlug: string;
    isOwner: boolean;
    sessionUserId?: string;
}) {
    const [product, setProduct] = useState(initial);
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const href = `/p/${product.slug ?? product.id}`;

    // Close dropdown on outside click
    useEffect(() => {
        if (!menuOpen) return;
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [menuOpen]);

    async function toggleLike() {
        if (!sessionUserId) return;
        const wasLiked = product.isLiked;
        setProduct(p => ({ ...p, isLiked: !wasLiked, likeCount: p.likeCount + (wasLiked ? -1 : 1) }));
        try {
            await fetch(`/api/products/${product.id}/like`, { method: 'POST' });
        } catch {
            setProduct(p => ({ ...p, isLiked: wasLiked, likeCount: p.likeCount + (wasLiked ? 1 : -1) }));
        }
    }

    async function toggleSave() {
        if (!sessionUserId) return;
        const wasSaved = product.isSaved;
        setProduct(p => ({ ...p, isSaved: !wasSaved, saveCount: p.saveCount + (wasSaved ? -1 : 1) }));
        try {
            await fetch(`/api/products/${product.id}/save`, { method: 'POST' });
        } catch {
            setProduct(p => ({ ...p, isSaved: wasSaved, saveCount: p.saveCount + (wasSaved ? 1 : -1) }));
        }
    }

    async function markSoldOut() {
        setMenuOpen(false);
        const prev = product.inStock;
        setProduct(p => ({ ...p, inStock: false }));
        try {
            const res = await fetch(`/api/products/${product.id}/sold-out`, { method: 'POST' });
            if (!res.ok) setProduct(p => ({ ...p, inStock: prev }));
        } catch {
            setProduct(p => ({ ...p, inStock: prev }));
        }
    }

    async function markInStock() {
        setMenuOpen(false);
        const prev = product.inStock;
        setProduct(p => ({ ...p, inStock: true }));
        try {
            const res = await fetch(`/api/products/${product.id}/restock`, { method: 'POST' });
            if (!res.ok) setProduct(p => ({ ...p, inStock: prev }));
        } catch {
            setProduct(p => ({ ...p, inStock: prev }));
        }
    }

    return (
        <div className={styles.feedCard}>
            {/* 3-dot owner menu */}
            {isOwner && (
                <div className={styles.menuWrap} ref={menuRef}>
                    <button
                        className={styles.menuBtn}
                        onClick={() => setMenuOpen(o => !o)}
                        aria-label="Product options"
                        type="button"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="12" cy="5" r="1.5" />
                            <circle cx="12" cy="12" r="1.5" />
                            <circle cx="12" cy="19" r="1.5" />
                        </svg>
                    </button>
                    {menuOpen && (
                        <div className={styles.menuDropdown}>
                            <Link
                                href={`/store/${storeSlug}/products/${product.id}/edit`}
                                className={styles.menuItem}
                                onClick={() => setMenuOpen(false)}
                            >
                                Edit product
                            </Link>
                            {product.inStock ? (
                                <button
                                    className={`${styles.menuItem} ${styles.menuItemDanger}`}
                                    onClick={markSoldOut}
                                    type="button"
                                >
                                    Mark as sold out
                                </button>
                            ) : (
                                <button
                                    className={styles.menuItem}
                                    onClick={markInStock}
                                    type="button"
                                >
                                    Mark as in stock
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Image */}
            <Link href={href} className={styles.feedCardImgWrap}>
                {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.title} className={styles.feedCardImg} />
                ) : (
                    <div className={styles.feedCardImgPlaceholder}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <rect width="18" height="18" x="3" y="3" rx="2" />
                            <circle cx="9" cy="9" r="2" />
                            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                        </svg>
                    </div>
                )}
                {product.isFeatured && (
                    <span className={styles.feedFeaturedBadge}>★ Featured</span>
                )}
                {!product.inStock && !product.isPortfolioItem && (
                    <div className={styles.feedSoldOutOverlay}>
                        <span className={styles.feedSoldOutLabel}>Sold out</span>
                    </div>
                )}
            </Link>

            {/* Body */}
            <div className={styles.feedCardBody}>
                <Link href={href} className={styles.feedCardTitleLink}>
                    <p className={styles.feedCardTitle}>{product.title}</p>
                    {product.isPortfolioItem ? (
                        <p className={styles.feedCardPriceEnquire}>Enquire</p>
                    ) : (
                        <p className={styles.feedCardPrice}>
                            {product.currency}{Number(product.price).toLocaleString()}
                        </p>
                    )}
                </Link>

                {/* Interactive actions */}
                <div className={styles.feedCardActions}>
                    <button
                        className={`${styles.actionBtn} ${product.isLiked ? styles.actionBtnLiked : ''}`}
                        onClick={toggleLike}
                        aria-label={product.isLiked ? 'Unlike' : 'Like'}
                        disabled={!sessionUserId}
                        type="button"
                        title={!sessionUserId ? 'Log in to like' : undefined}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24"
                            fill={product.isLiked ? 'currentColor' : 'none'}
                            stroke="currentColor" strokeWidth="2">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                        <span>{product.likeCount}</span>
                    </button>

                    <Link href={href} className={styles.actionBtn} aria-label="Comments">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        <span>{product.commentCount}</span>
                    </Link>

                    <button
                        className={`${styles.actionBtn} ${product.isSaved ? styles.actionBtnSaved : ''}`}
                        onClick={toggleSave}
                        aria-label={product.isSaved ? 'Unsave' : 'Save'}
                        disabled={!sessionUserId}
                        type="button"
                        title={!sessionUserId ? 'Log in to save' : undefined}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24"
                            fill={product.isSaved ? 'currentColor' : 'none'}
                            stroke="currentColor" strokeWidth="2">
                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                        </svg>
                        <span>{product.saveCount}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Tab bar shell ─────────────────────────────────────────────────────────────

export default function StoreTabBar({
    products,
    storeId,
    storeSlug,
    sessionUserId,
    isOwner,
}: StoreTabBarProps) {
    const [activeTab, setActiveTab] = useState<TabKey>('products');
    const [sortKey, setSortKey] = useState<StoreSortKey>('default');

    const sortedProducts = [...products].sort((a, b) => {
        if (sortKey === 'price_asc') return a.price - b.price;
        if (sortKey === 'price_desc') return b.price - a.price;
        // default: featured first, then original order
        return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
    });

    return (
        <div>
            {/* Tab Bar */}
            <div className={styles.tabBar} role="tablist">
                <button
                    role="tab"
                    aria-selected={activeTab === 'products'}
                    className={`${styles.tab} ${activeTab === 'products' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('products')}
                    type="button"
                >
                    Products
                </button>
                <button
                    role="tab"
                    aria-selected={activeTab === 'updates'}
                    className={`${styles.tab} ${activeTab === 'updates' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('updates')}
                    type="button"
                >
                    Updates
                </button>

                {/* Price sort pills — visible on products tab */}
                {activeTab === 'products' && products.length > 0 && (
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, paddingRight: 8 }}>
                        {STORE_SORT_OPTIONS.map(opt => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => setSortKey(opt.value)}
                                title={opt.label}
                                style={{
                                    padding: '4px 10px',
                                    borderRadius: 20,
                                    border: `1.5px solid ${sortKey === opt.value ? 'var(--primary)' : 'var(--card-border)'}`,
                                    background: sortKey === opt.value ? 'rgba(var(--primary-rgb),0.1)' : 'transparent',
                                    color: sortKey === opt.value ? 'var(--primary)' : 'var(--text-muted)',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {opt.icon}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Products Tab */}
            {activeTab === 'products' && (
                <div className={styles.productsSection}>
                    {products.length === 0 ? (
                        isOwner ? (
                            <SellerChecklist storeSlug={storeSlug} />
                        ) : (
                            <EmptyState
                                title="No products listed yet"
                                description="This store hasn't added any products yet. Check back soon!"
                            />
                        )
                    ) : (
                        <div className={styles.feedScroll}>
                            {sortedProducts.map(product => (
                                <StoreProductCard
                                    key={product.id}
                                    product={product}
                                    storeSlug={storeSlug}
                                    isOwner={isOwner}
                                    sessionUserId={sessionUserId}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Updates Tab */}
            {activeTab === 'updates' && (
                <div className={styles.updatesSection}>
                    <StoreFeed
                        storeId={storeId}
                        storeSlug={storeSlug}
                        sessionUserId={sessionUserId}
                        isOwner={isOwner}
                    />
                </div>
            )}
        </div>
    );
}
