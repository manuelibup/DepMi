'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import styles from './StoreTabBar.module.css';
import StoreFeed from './StoreFeed';
import EmptyState from '@/components/EmptyState';

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

export default function StoreTabBar({
    products,
    storeId,
    storeSlug,
    sessionUserId,
    isOwner,
}: StoreTabBarProps) {
    const [activeTab, setActiveTab] = useState<TabKey>('products');

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
            </div>

            {/* Products Tab */}
            {activeTab === 'products' && (
                <div className={styles.productsSection}>
                    {products.length === 0 ? (
                        <EmptyState
                            title="No products listed yet"
                            description={isOwner
                                ? "Your store is ready — add your first product to start selling."
                                : "This store hasn't added any products yet. Check back soon!"}
                            actionLabel={isOwner ? "Add Your First Product" : undefined}
                            actionHref={isOwner ? `/store/${storeSlug}/products/new` : undefined}
                        />
                    ) : (
                        <div className={styles.productGrid}>
                            {products.map(product => {
                                const href = `/p/${product.slug ?? product.id}`;
                                return (
                                    <div key={product.id} className={styles.gridCard}>
                                        <Link href={href} style={{ display: 'contents', textDecoration: 'none' }}>
                                            <div className={styles.gridCardImg}>
                                                {product.imageUrl ? (
                                                    <img src={product.imageUrl} alt={product.title} />
                                                ) : (
                                                    <div className={styles.gridCardImgPlaceholder}>
                                                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                            <rect width="18" height="18" x="3" y="3" rx="2" />
                                                            <circle cx="9" cy="9" r="2" />
                                                            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                                                        </svg>
                                                    </div>
                                                )}
                                                {product.isFeatured && (
                                                    <span className={styles.gridFeaturedBadge}>★ Featured</span>
                                                )}
                                                {!product.inStock && !product.isPortfolioItem && (
                                                    <div className={styles.gridOutStockOverlay}>
                                                        <span className={styles.gridOutStockLabel}>Out of stock</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className={styles.gridCardBody}>
                                                <p className={styles.gridCardTitle}>{product.title}</p>
                                                {product.isPortfolioItem ? (
                                                    <p className={styles.gridCardPriceEnquire}>Enquire</p>
                                                ) : (
                                                    <p className={styles.gridCardPrice}>{product.currency}{Number(product.price).toLocaleString()}</p>
                                                )}
                                                <div className={styles.gridCardStats}>
                                                    <span className={styles.gridStat}>
                                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                                                        {product.likeCount}
                                                    </span>
                                                    <span className={styles.gridStat}>
                                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                                                        {product.commentCount}
                                                    </span>
                                                    <span className={styles.gridStat}>
                                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                                                        {product.saveCount}
                                                    </span>
                                                </div>
                                            </div>
                                        </Link>
                                        {isOwner && (
                                            <div className={styles.gridOwnerActions}>
                                                <Link href={`/store/${storeSlug}/products/${product.id}/edit`} className={styles.gridEditBtn}>
                                                    Edit
                                                </Link>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
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
