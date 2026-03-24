'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './FeedCarousel.module.css';
import { cloudinaryTransform } from '@/lib/cloudinary';

interface CarouselProduct {
    id: string;
    title: string;
    price: string;
    image: string;
    store: string;
    storeSlug: string;
    storeColor: string;
    storeInitial: string;
}

export default function FeedCarousel() {
    const router = useRouter();
    const [products, setProducts] = useState<CarouselProduct[]>([]);

    useEffect(() => {
        fetch('/api/feed/featured')
            .then(r => r.json())
            .then(d => setProducts(d.products ?? []))
            .catch(() => { });
    }, []);

    if (products.length === 0) return null;

    return (
        <div className={styles.section}>
            <div className={styles.heading}>
                <span className={styles.label}>Trending Now</span>
                <Link href="/search" className={styles.seeAll}>See all →</Link>
            </div>
            <div className={styles.track}>
                {products.map(p => (
                    <article
                        key={p.id}
                        className={styles.card}
                        onClick={() => router.push(`/p/${p.id}`)}
                    >
                        <div className={styles.imageWrap}>
                            {p.image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={cloudinaryTransform(p.image, 300)} alt={p.title} className={styles.image} width={300} height={300} loading="lazy" />
                            ) : (
                                <div className={styles.imageFallback} style={{ background: p.storeColor }}>
                                    <span className={styles.fallbackInitial}>{p.storeInitial}</span>
                                </div>
                            )}
                        </div>
                        <div className={styles.body}>
                            <p className={styles.storeName}>{p.store}</p>
                            <p className={styles.title}>{p.title}</p>
                            <p className={styles.price}>{p.price}</p>
                        </div>
                    </article>
                ))}
            </div>
        </div>
    );
}
