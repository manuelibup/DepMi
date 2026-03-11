'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './ProfileTabs.module.css';
import ProfileProductsGrid from './ProfileProductsGrid';

type SerializedProduct = {
    id: string;
    title: string;
    price: number;
    slug: string | null;
    isFeatured: boolean;
    imageUrl: string | null;
};

type Demand = {
    id: string;
    text: string;
    budget: number;
    createdAt: string;
    _count: { bids: number };
};

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
                        <div className={styles.requestList}>
                            {demands.map(d => (
                                <Link key={d.id} href={'/requests/' + d.id} className={styles.requestItem}>
                                    <p className={styles.requestText}>{d.text}</p>
                                    <div className={styles.requestMeta}>
                                        <span className={styles.requestBudget}>
                                            &#x20A6;{Number(d.budget).toLocaleString()}
                                        </span>
                                        <span className={styles.requestSub}>
                                            {d._count.bids} bid{d._count.bids !== 1 ? 's' : ''} &middot;{' '}
                                            {new Date(d.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </Link>
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
                                const context = r.product
                                    ? 'on "' + r.product.title + '"'
                                    : r.demand
                                        ? 'on a request'
                                        : '';
                                return (
                                    <Link key={r.id} href={href} className={styles.replyItem}>
                                        <div className={styles.replyMeta}>
                                            <span className={styles.replyContext}>{context}</span>
                                            <span className={styles.replySub}>
                                                {new Date(r.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p className={styles.replyText}>{r.text}</p>
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
