'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './ProfileTabs.module.css';
import ProfileProductsGrid from './ProfileProductsGrid';
import DemandCard, { DemandData } from '@/components/DemandCard';

type SerializedProduct = {
    id: string;
    title: string;
    price: number;
    slug: string | null;
    isFeatured: boolean;
    imageUrl: string | null;
};

type Demand = DemandData;

type Reply = {
    id: string;
    text: string;
    createdAt: string;
    productId: string | null;
    demandId: string | null;
    product: { title: string; slug: string | null; id: string } | null;
    demand: { text: string; id: string } | null;
};

interface ProfileTabsProps {
    products: SerializedProduct[];
    demands: Demand[];
    replies: Reply[];
    isOwnProfile: boolean;
    userStore: { id: string; slug: string; name: string } | null;
}

type TabKey = 'posts' | 'requests' | 'replies';

const TAB_ORDER: TabKey[] = ['posts', 'requests', 'replies'];

export default function ProfileTabs({
    products,
    demands,
    replies,
    isOwnProfile,
    userStore,
}: ProfileTabsProps) {
    const searchParams = useSearchParams();
    const router = useRouter();

    const tabs: { key: TabKey; label: string; hasContent: boolean }[] = [
        { key: 'posts', label: 'Posts', hasContent: products.length > 0 },
        { key: 'requests', label: 'Requests', hasContent: demands.length > 0 },
        { key: 'replies', label: 'Replies', hasContent: replies.length > 0 },
    ];

    const visibleTabs = tabs.filter(t => t.hasContent);
    const visibleKeys = visibleTabs.map(t => t.key);

    const rawTab = searchParams.get('tab') as TabKey | null;
    const activeTab: TabKey = rawTab && visibleKeys.includes(rawTab)
        ? rawTab
        : (visibleKeys[0] ?? 'posts');

    // Swipe handling
    const touchStartX = useRef<number | null>(null);

    function handleTouchStart(e: React.TouchEvent) {
        touchStartX.current = e.touches[0].clientX;
    }

    function handleTouchEnd(e: React.TouchEvent) {
        if (touchStartX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        touchStartX.current = null;
        if (Math.abs(dx) < 50) return; // too short

        const currentIdx = visibleKeys.indexOf(activeTab);
        if (dx < 0 && currentIdx < visibleKeys.length - 1) {
            // swipe left → next tab
            router.push(`?tab=${visibleKeys[currentIdx + 1]}`, { scroll: false });
        } else if (dx > 0 && currentIdx > 0) {
            // swipe right → previous tab
            router.push(`?tab=${visibleKeys[currentIdx - 1]}`, { scroll: false });
        }
    }

    if (visibleTabs.length === 0) return null;

    return (
        <div>
            {/* Tab Bar */}
            <div className={styles.tabBar} role="tablist">
                {visibleTabs.map(tab => (
                    <Link
                        key={tab.key}
                        href={`?tab=${tab.key}`}
                        scroll={false}
                        role="tab"
                        aria-selected={activeTab === tab.key}
                        className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ''}`}
                    >
                        {tab.label}
                    </Link>
                ))}
            </div>

            {/* Tab Panels — swipeable wrapper */}
            <div
                className={styles.tabPanel}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                {/* Posts tab */}
                {activeTab === 'posts' && (
                    <>
                        {products.length > 0 && userStore ? (
                            <>
                                {isOwnProfile && (
                                    <div className={styles.sectionHeader}>
                                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            Tap the star icon to pin a product to your profile
                                        </p>
                                        <Link href={'/store/' + userStore.slug} className={styles.seeAll}>
                                            See all
                                        </Link>
                                    </div>
                                )}
                                {!isOwnProfile && (
                                    <div className={styles.sectionHeader} style={{ paddingBottom: 8 }}>
                                        <span />
                                        <Link href={'/store/' + userStore.slug} className={styles.seeAll}>
                                            See all
                                        </Link>
                                    </div>
                                )}
                                <ProfileProductsGrid
                                    products={products}
                                    isOwnProfile={isOwnProfile}
                                />
                            </>
                        ) : (
                            <p className={styles.empty}>No products yet.</p>
                        )}
                    </>
                )}

                {/* Requests tab */}
                {activeTab === 'requests' && (
                    demands.length > 0 ? (
                        <div>
                            {demands.map((d, i) => (
                                <DemandCard key={d.id} data={d} index={i} />
                            ))}
                        </div>
                    ) : (
                        <p className={styles.empty}>No requests yet.</p>
                    )
                )}

                {/* Replies tab */}
                {activeTab === 'replies' && (
                    replies.length > 0 ? (
                        <div className={styles.replyList}>
                            {replies.map(r => {
                                const href = r.productId
                                    ? '/p/' + (r.product?.slug ?? r.productId)
                                    : r.demandId
                                        ? '/requests/' + r.demandId
                                        : '#';
                                const contextLabel = r.product
                                    ? r.product.title
                                    : r.demand
                                        ? r.demand.text.slice(0, 40) + (r.demand.text.length > 40 ? '…' : '')
                                        : 'a post';
                                return (
                                    <Link key={r.id} href={href} className={styles.replyCard}>
                                        <div className={styles.replyContextBar}>
                                            <span className={styles.replyContextLink}>
                                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>
                                                Replied to <span>{contextLabel}</span>
                                            </span>
                                            <span className={styles.replyDate}>{new Date(r.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        <div className={styles.replyBody}>
                                            <p className={styles.replyText}>{r.text}</p>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    ) : (
                        <p className={styles.empty}>No replies yet.</p>
                    )
                )}
            </div>
        </div>
    );
}
