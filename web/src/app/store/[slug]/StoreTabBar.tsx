'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './StoreTabBar.module.css';
import pageStyles from './page.module.css';
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
                        <div className={pageStyles.productsGrid}>
                            {products.map(product => {
                                const isDim = !product.inStock && !product.isPortfolioItem;
                                const cellClass = `${pageStyles.productCell} ${isDim ? pageStyles.productCellDim : ''}`;

                                const cellContent = (
                                    <>
                                        <div className={pageStyles.productImg}>
                                            {product.imageUrl ? (
                                                <Image
                                                    src={product.imageUrl}
                                                    alt={product.title}
                                                    fill
                                                    style={{ objectFit: 'cover' }}
                                                    sizes="(max-width: 480px) 50vw, 240px"
                                                />
                                            ) : (
                                                <div className={pageStyles.productImgPlaceholder}>
                                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                        <rect width="18" height="18" x="3" y="3" rx="2" />
                                                        <circle cx="9" cy="9" r="2" />
                                                        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                                                    </svg>
                                                </div>
                                            )}

                                            {product.isFeatured && (
                                                <span className={pageStyles.featuredBadge}>★</span>
                                            )}
                                            {product.isPortfolioItem && (
                                                <span className={pageStyles.portfolioBadge}>Portfolio</span>
                                            )}
                                            {isOwner && !product.inStock && !product.isPortfolioItem && (
                                                <span className={pageStyles.outOfStockBadge}>Out of stock</span>
                                            )}
                                        </div>

                                        <div className={pageStyles.productInfo}>
                                            <p className={pageStyles.productTitle}>{product.title}</p>
                                            {product.isPortfolioItem ? (
                                                <p className={pageStyles.productEnquire}>Enquire</p>
                                            ) : (
                                                <p className={`${pageStyles.productPrice} ${!product.inStock ? pageStyles.productPriceDim : ''}`}>
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
                                            href={`/store/${storeSlug}/products/${product.id}/edit`}
                                            className={pageStyles.productEditBtn}
                                        >
                                            Edit
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
