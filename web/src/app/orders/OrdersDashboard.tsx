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
        CONFIRMED: 'Paid — Awaiting Shipment',
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
    if (status === 'PENDING') return styles.status_ESCROW_HELD;
    if (status === 'CONFIRMED') return styles.status_SHIPPED;
    if (status === 'SHIPPED') return styles.status_SHIPPED;
    if (['DELIVERED', 'COMPLETED'].includes(status)) return styles.status_COMPLETED;
    if (status === 'DISPUTED') return styles.status_DISPUTED;
    return styles.status_ESCROW_HELD;
}

function OrderCard({ order, role, onStatusChange }: {
    order: OrderItem;
    role: 'buyer' | 'seller';
    onStatusChange: (orderId: string, newStatus: string) => void;
}) {
    const image = order.product.images[0]?.url;
    const shortId = order.id.slice(-6).toUpperCase();
    const [loading, setLoading] = useState(false);
    const [showDisputeModal, setShowDisputeModal] = useState(false);
    const [disputeReason, setDisputeReason] = useState('');
    const [localStatus, setLocalStatus] = useState(order.status);

    const handleConfirmDelivery = async () => {
        if (!confirm('Confirm that you received this order? This will release payment to the seller.')) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/orders/${order.id}/confirm`, { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                setLocalStatus('COMPLETED');
                onStatusChange(order.id, 'COMPLETED');
            } else {
                alert(data.error ?? 'Failed to confirm delivery. Please try again.');
            }
        } catch {
            alert('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleDispute = async () => {
        if (!disputeReason.trim()) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/orders/${order.id}/dispute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: disputeReason }),
            });
            const data = await res.json();
            if (res.ok) {
                setLocalStatus('DISPUTED');
                onStatusChange(order.id, 'DISPUTED');
                setShowDisputeModal(false);
            } else {
                alert(data.error ?? 'Failed to open dispute.');
            }
        } catch {
            alert('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className={styles.orderCard}>
                <div className={styles.orderHeader}>
                    <p className={styles.orderId}>ORDER #{shortId}</p>
                    <span className={`${styles.statusBadge} ${statusClass(localStatus)}`}>
                        {statusLabel(localStatus)}
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

                {/* Buyer actions */}
                {role === 'buyer' && localStatus === 'SHIPPED' && (
                    <div className={styles.orderAction}>
                        <button
                            className={`${styles.actionBtn} ${styles.primary}`}
                            onClick={handleConfirmDelivery}
                            disabled={loading}
                        >
                            {loading ? 'Processing…' : 'Mark as Received'}
                        </button>
                        <button
                            className={`${styles.actionBtn} ${styles.danger}`}
                            onClick={() => setShowDisputeModal(true)}
                            disabled={loading}
                        >
                            Open Dispute
                        </button>
                    </div>
                )}

                {/* Seller action — ship */}
                {role === 'seller' && localStatus === 'CONFIRMED' && (
                    <div className={styles.orderAction}>
                        <button
                            className={`${styles.actionBtn} ${styles.primary}`}
                            onClick={async () => {
                                if (!confirm('Confirm that you have shipped this order?')) return;
                                setLoading(true);
                                try {
                                    const res = await fetch(`/api/orders/${order.id}/ship`, { method: 'POST' });
                                    const data = await res.json();
                                    if (res.ok) {
                                        setLocalStatus('SHIPPED');
                                        onStatusChange(order.id, 'SHIPPED');
                                    } else {
                                        alert(data.message ?? 'Failed to mark as shipped.');
                                    }
                                } catch {
                                    alert('Network error. Please try again.');
                                } finally {
                                    setLoading(false);
                                }
                            }}
                            disabled={loading}
                        >
                            {loading ? 'Processing…' : 'Mark as Shipped'}
                        </button>
                    </div>
                )}
            </div>

            {/* Dispute modal */}
            {showDisputeModal && (
                <div className={styles.modalOverlay} onClick={() => setShowDisputeModal(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <h3 className={styles.modalTitle}>Open a Dispute</h3>
                        <p className={styles.modalDesc}>
                            Funds will be frozen until our team reviews. Describe the issue clearly.
                        </p>
                        <textarea
                            className={styles.disputeInput}
                            placeholder="e.g. Item not delivered, wrong item received, item is damaged…"
                            value={disputeReason}
                            onChange={(e) => setDisputeReason(e.target.value)}
                            rows={4}
                        />
                        <div className={styles.modalActions}>
                            <button
                                className={`${styles.actionBtn} ${styles.ghost}`}
                                onClick={() => setShowDisputeModal(false)}
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                className={`${styles.actionBtn} ${styles.danger}`}
                                onClick={handleDispute}
                                disabled={loading || !disputeReason.trim()}
                            >
                                {loading ? 'Submitting…' : 'Submit Dispute'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default function OrdersDashboard({ hasStore, storeName, purchases, sales }: Props) {
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState<'purchases' | 'sales'>('purchases');
    const [showCelebration, setShowCelebration] = useState(false);
    const [localPurchases, setLocalPurchases] = useState(purchases);
    const [localSales, setLocalSales] = useState(sales);

    useEffect(() => {
        if (searchParams?.get('success') === 'true') {
            setTimeout(() => setShowCelebration(true), 0);
            setTimeout(() => setShowCelebration(false), 8000);
        }
    }, [searchParams]);

    const handleStatusChange = (orderId: string, newStatus: string) => {
        setLocalPurchases(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
        setLocalSales(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    };

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
                        {localPurchases.length > 0 ? (
                            localPurchases.map(o => (
                                <OrderCard key={o.id} order={o} role="buyer" onStatusChange={handleStatusChange} />
                            ))
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
                        {localSales.length > 0 ? (
                            localSales.map(o => (
                                <OrderCard key={o.id} order={o} role="seller" onStatusChange={handleStatusChange} />
                            ))
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
