'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import styles from './ProductCardGrid.module.css';
import type { ProductData } from '@/components/ProductCard';

interface Props {
    data: ProductData;
    index?: number;
}

export default function ProductCardGrid({ data, index = 0 }: Props) {
    const router = useRouter();

    return (
        <article
            className={styles.card}
            style={{ animationDelay: `${index * 40}ms` }}
            onClick={() => data.id && router.push(`/p/${data.id}`)}
        >
            <div className={styles.imageWrap}>
                {data.inStock === false && (
                    <div className={styles.oosBadge}>Out of Stock</div>
                )}
                {data.inStock !== false && typeof data.stock === 'number' && data.stock === 1 && (
                    <div className={styles.stockBadge}>1 Left</div>
                )}
                {data.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={data.image} alt={data.title} className={styles.image} loading="lazy" />
                ) : (
                    <div className={styles.imageFallback} style={{ background: data.storeColor }}>
                        <span className={styles.fallbackInitial}>{data.storeInitial}</span>
                    </div>
                )}
            </div>
            <div className={styles.body}>
                <p className={styles.store}>{data.store}</p>
                <p className={styles.title}>{data.title}</p>
                <p className={styles.price}>{data.price}</p>
            </div>
        </article>
    );
}
