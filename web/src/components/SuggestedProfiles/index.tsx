'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './SuggestedProfiles.module.css';
import Image from 'next/image';

export interface SuggestedStore {
    id: string;
    slug: string;
    name: string;
    logoUrl: string | null;
    depCount: number;
}

export default function SuggestedProfiles({ stores }: { stores: SuggestedStore[] }) {
    const router = useRouter();

    if (!stores || stores.length === 0) return null;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h3 className={styles.title}>Suggested Stores To Follow</h3>
            </div>
            <div className={styles.carousel}>
                {stores.map((store) => (
                    <div key={store.id} className={styles.card}>
                        <div className={styles.avatar}>
                            {store.logoUrl ? (
                                <Image src={store.logoUrl} alt={store.name} fill style={{ objectFit: 'cover' }} sizes="60px" />
                            ) : (
                                <div className={styles.avatarFallback}>{store.name.charAt(0).toUpperCase()}</div>
                            )}
                        </div>
                        <h4 className={styles.name}>{store.name}</h4>
                        <p className={styles.subtitle}>{store.depCount} Deps</p>
                        <button 
                            className={styles.actionBtn}
                            onClick={() => router.push(`/store/${store.slug}`)}
                        >
                            View Store
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
