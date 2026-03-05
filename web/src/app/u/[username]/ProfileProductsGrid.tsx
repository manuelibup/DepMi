'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import styles from './page.module.css';

type Product = {
    id: string;
    title: string;
    price: number;
    slug: string | null;
    isFeatured: boolean;
    imageUrl: string | null;
};

export default function ProfileProductsGrid({
    products: initialProducts,
    isOwnProfile,
}: {
    products: Product[];
    isOwnProfile: boolean;
}) {
    const [products, setProducts] = useState(initialProducts);
    const [toggling, setToggling] = useState<string | null>(null);

    const toggleFeatured = useCallback(async (productId: string) => {
        if (toggling) return;
        setToggling(productId);

        // Optimistic update + re-sort: featured first, then by price
        setProducts(prev => {
            const updated = prev.map(p =>
                p.id === productId ? { ...p, isFeatured: !p.isFeatured } : p
            );
            return [...updated].sort((a, b) => {
                if (a.isFeatured && !b.isFeatured) return -1;
                if (!a.isFeatured && b.isFeatured) return 1;
                return b.price - a.price;
            });
        });

        try {
            await fetch(`/api/products/${productId}/feature`, { method: 'POST' });
        } catch {
            setProducts(initialProducts);
        } finally {
            setToggling(null);
        }
    }, [toggling, initialProducts]);

    return (
        <div className={styles.productsGrid}>
            {products.map(p => (
                <div key={p.id} className={styles.productCell}>
                    <Link href={`/p/${p.slug ?? p.id}`} className={styles.productCellLink}>
                        {p.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.imageUrl} alt={p.title} className={styles.productCellImg} />
                        ) : (
                            <div className={styles.productCellPlaceholder}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <rect width="18" height="18" x="3" y="3" rx="2" />
                                    <circle cx="9" cy="9" r="2" />
                                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                                </svg>
                            </div>
                        )}
                        <div className={styles.productCellOverlay}>
                            <span className={styles.productCellPrice}>₦{p.price.toLocaleString()}</span>
                        </div>
                        {p.isFeatured && <span className={styles.featuredDot} title="Featured">★</span>}
                    </Link>

                    {isOwnProfile && (
                        <button
                            type="button"
                            className={`${styles.featureToggle} ${p.isFeatured ? styles.featureToggleOn : ''}`}
                            onClick={() => toggleFeatured(p.id)}
                            disabled={toggling === p.id}
                            title={p.isFeatured ? 'Remove from featured' : 'Pin to profile'}
                        >
                            {toggling === p.id ? '…' : p.isFeatured ? '★' : '☆'}
                        </button>
                    )}
                </div>
            ))}
        </div>
    );
}
