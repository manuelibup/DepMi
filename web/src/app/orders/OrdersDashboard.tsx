'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import EmptyState from '@/components/EmptyState';
import styles from './page.module.css';

interface OrderItem {
    id: string;
    status: string;
    escrowStatus: string;
    total: number;
    createdAt: string;
    product: { title: string; images: { url: string }[] };
    store?: { name: string };
    buyer?: { displayName: string; username: string };
}

interface Props {
    hasStore: boolean;
    storeName?: string;
    purchases: OrderItem[];
    sales: OrderItem[];
}

function statusLabel(status: string): string {
    const map: Record<string, string> = {
        PENDING: 'Pending',
        CONFIRMED: 'Confirmed',
        SHIPPED: 'Shipped',
        DELIVERED: 'Delivered',
        COMPLETED: 'Completed',
        CANCELLED: 'Cancelled',
        DISPUTED: 'Disputed',
        RESOLVED_BUYER: 'Resolved',
        RESOLVED_VENDOR: 'Resolved',
        REFUNDED: 'Refunded',
    };
    return map[status] ?? status;
}

function statusClass(status: string): string {
    if (['PENDING', 'CONFIRMED'].includes(status)) return styles.status_ESCROW_HELD;
    if (status === 'SHIPPED') return styles.status_SHIPPED;
    if (['DELIVERED', 'COMPLETED'].includes(status)) return styles.status_COMPLETED;
    return styles.status_ESCROW_HELD;
}

function OrderCard({ order, role }: { order: OrderItem; role: 'buyer' | 'seller' }) {
    const image = order.product.images[0]?.url;
    const shortId = order.id.slice(-6).toUpperCase();

    return (
        <div className={styles.orderCard}>
            <div className={styles.orderHeader}>
                <p className={styles.orderId}>ORDER #{shortId}</p>
                <span className={`${styles.statusBadge} ${statusClass(order.status)}`}>
                    {statusLabel(order.status)}
                </span>
            </div>
            <div className={styles.orderItem}>
                <div className={styles.itemImage}>
                    {image ? (
                        <Image src={image} alt={order.product.title} width={64} height={64} style={{ objectFit: 'cover', borderRadius: '12px' }} />
                    ) : (
                        <span style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>📦</span>
                    )}
                </div>
                <div className={styles.itemInfo}>
                    <h4 className={styles.itemTitle}>{order.product.title}</h4>
                    <p className={styles.itemMeta}>
                        {role === 'buyer'
                            ? `Sold by: ${order.store?.name ?? '—'}`
                            : `Buyer: @${order.buyer?.username ?? order.buyer?.displayName ?? '—'}`}
                    </p>
                    <p className={styles.itemPrice}>₦{order.total.toLocaleString()}</p>
                </div>
            </div>

            {role === 'buyer' && order.status === 'SHIPPED' && (
                <div className={styles.orderAction}>
                    <button className={`${styles.actionBtn} ${styles.primary}`}>
                        Mark as Received
                    </button>
                </div>
            )}
            {role === 'seller' && order.status === 'CONFIRMED' && (
                <div className={styles.orderAction}>
                    <button className={`${styles.actionBtn} ${styles.primary}`}>
                        Add Tracking &amp; Ship
                    </button>
                </div>
            )}
        </div>
    );
}

export default function OrdersDashboard({ hasStore, storeName, purchases, sales }: Props) {
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState<'purchases' | 'sales'>('purchases');
    const [showCelebration, setShowCelebration] = useState(false);

    useEffect(() => {
        if (searchParams?.get('success') === 'true') {
            setTimeout(() => setShowCelebration(true), 0);
            setTimeout(() => setShowCelebration(false), 8000);
        }
    }, [searchParams]);

    return (
        <div className={styles.main}>
            <div className={styles.tabs}>
                <button
                    className={`${styles.tab} ${activeTab === 'purchases' ? styles.active : ''}`}
                    onClick={() => setActiveTab('purchases')}
                >
                    My Purchases
                </button>
                {hasStore && (
                    <button
                        className={`${styles.tab} ${activeTab === 'sales' ? styles.active : ''}`}
                        onClick={() => setActiveTab('sales')}
                    >
                        Store Sales {storeName ? `(${storeName})` : ''}
                    </button>
                )}
            </div>

            <div className={styles.container}>
                {showCelebration && activeTab === 'purchases' && (
                    <div className={styles.celebration}>
                        <div className={styles.celebrationIcon}>🏆</div>
                        <div className={styles.celebrationText}>
                            <h3>Order Placed Successfully!</h3>
                            <p>Your funds are safely locked in DepMi Escrow. The seller has been notified to ship.</p>
                        </div>
                    </div>
                )}

                {activeTab === 'purchases' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {purchases.length > 0 ? (
                            purchases.map(o => <OrderCard key={o.id} order={o} role="buyer" />)
                        ) : (
                            <EmptyState
                                title="No purchases yet"
                                description="When you buy products via Escrow, they will securely track here."
                                actionLabel="Browse Products"
                                actionHref="/"
                            />
                        )}
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {sales.length > 0 ? (
                            sales.map(o => <OrderCard key={o.id} order={o} role="seller" />)
                        ) : (
                            <EmptyState
                                title="No sales yet"
                                description="Your inbound orders will appear here once buyers place an Escrow purchase."
                            />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
