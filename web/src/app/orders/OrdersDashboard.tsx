'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import EmptyState from '@/components/EmptyState';
import styles from './page.module.css';

interface OrderItem {
    id: string;
    status: string;
    escrowStatus: string;
    total: number;
    createdAt: string;
    product: { id: string; title: string; images: { url: string }[] };
    store?: { name: string };
    seller?: { name: string; ownerId: string };
    buyer?: { displayName: string; username: string };
    trackingNo?: string;
    deliveryMethod?: string;
    hasReviewed?: boolean;
}

interface Props {
    hasStore: boolean;
    storeName?: string;
    purchases: OrderItem[];
    sales: OrderItem[];
}

function statusLabel(status: string): string {
    const map: Record<string, string> = {
        PENDING: 'Pending — Awaiting Payment',
        EXPIRED: 'Payment Expired',
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
    if (status === 'PENDING') return styles.status_PENDING;
    if (status === 'EXPIRED') return styles.status_EXPIRED;
    if (status === 'CANCELLED') return styles.status_CANCELLED;
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
    const [localStatus, setLocalStatus] = useState(order.status);
    const [showShipModal, setShowShipModal] = useState(false);
    const [showDisputeModal, setShowDisputeModal] = useState(false);
    const [showOtpModal, setShowOtpModal] = useState(false);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [hasReviewed, setHasReviewed] = useState(order.hasReviewed || false);
    const [reviewRating, setReviewRating] = useState(0);
    const [reviewText, setReviewText] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [disputeReason, setDisputeReason] = useState('');
    const [shipInfo, setShipInfo] = useState({ trackingNo: '', deliveryMethod: '' });

    useEffect(() => {
        // If pending, check if expired (e.g. 15 mins)
        // For simplicity, we can do client side check or wait for next refresh
        // But the user wants the label update.
        if (localStatus === 'PENDING') {
            const created = new Date(order.createdAt).getTime();
            const now = Date.now();
            if (now - created > 15 * 60 * 1000) {
                setLocalStatus('EXPIRED');
            }
        }
    }, [localStatus, order.createdAt]);

    const handleConfirmDelivery = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/orders/${order.id}/confirm`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: otpCode })
            });
            const data = await res.json();
            if (res.ok) {
                setLocalStatus('COMPLETED');
                onStatusChange(order.id, 'COMPLETED');
                setShowOtpModal(false);
            } else {
                alert(data.error ?? 'Verification failed. Please check the code.');
            }
        } catch {
            alert('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const triggerOtp = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/otp/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'TRANSACTIONAL' })
            });
            if (res.ok) {
                setOtpSent(true);
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to send OTP.');
                setShowOtpModal(false);
            }
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
                <Link href={order.product.id ? `/p/${order.product.id}` : '#'} className={styles.orderItem} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className={styles.itemImage}>
                        {image ? (
                            <Image src={image} alt={order.product.title} width={64} height={64} style={{ objectFit: 'cover', borderRadius: '12px' }} />
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                            </div>
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
                        {(order.trackingNo || order.deliveryMethod) && localStatus !== 'PENDING' && (
                            <div className={styles.trackingInfo}>
                                <p style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                                    <strong>{order.deliveryMethod || 'Shipped'}:</strong> {order.trackingNo || 'Contact seller'}
                                </p>
                            </div>
                        )}
                    </div>
                </Link>

                {/* Buyer actions */}
                {role === 'buyer' && (
                    <div className={styles.orderAction}>
                        {localStatus === 'PENDING' && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', width: '100%' }}>
                                <Link href={`/checkout/${order.product.id}?resume=${order.id}`} className={`${styles.actionBtn} ${styles.primary}`} style={{ textDecoration: 'none', textAlign: 'center', flex: '1 1 120px' }}>
                                    Resume Checkout
                                </Link>
                                <button
                                    className={`${styles.actionBtn} ${styles.ghost}`}
                                    style={{ flex: '1 1 120px' }}
                                    onClick={async () => {
                                        setLoading(true);
                                        try {
                                            const res = await fetch(`/api/orders/${order.id}/verify`, { method: 'POST' });
                                            const data = await res.json();
                                            if (res.ok && data.success) {
                                                setLocalStatus('CONFIRMED');
                                                onStatusChange(order.id, 'CONFIRMED');
                                                window.dispatchEvent(new Event('refresh_earnings'));
                                            } else {
                                                alert(data.message || data.error || 'Verification failed.');
                                            }
                                        } catch {
                                            alert('Network error. Please try again.');
                                        } finally {
                                            setLoading(false);
                                        }
                                    }}
                                    disabled={loading}
                                >
                                    {loading ? 'Checking...' : 'Verify Payment'}
                                </button>
                                <button
                                    className={`${styles.actionBtn} ${styles.danger}`}
                                    style={{ flex: '1 1 100%', marginTop: '4px' }}
                                    onClick={async () => {
                                        if (!confirm('Are you sure you want to cancel this pending order?')) return;
                                        setLoading(true);
                                        try {
                                            const res = await fetch(`/api/orders/${order.id}/cancel`, { method: 'POST' });
                                            if (res.ok) {
                                                setLocalStatus('CANCELLED');
                                                onStatusChange(order.id, 'CANCELLED');
                                            } else {
                                                const data = await res.json();
                                                alert(data.error || 'Failed to cancel.');
                                            }
                                        } finally {
                                            setLoading(false);
                                        }
                                    }}
                                    disabled={loading}
                                >
                                    Cancel Order
                                </button>
                            </div>
                        )}
                        {['CONFIRMED', 'SHIPPED', 'DELIVERED'].includes(localStatus) && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                                <div className={styles.orderInstructions}>
                                    <p style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                        <svg style={{ flexShrink: 0, marginTop: '1px' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
                                        <span><strong>Payment Confirmed.</strong> The seller has been notified to prepare your order. You can chat with them to discuss delivery.</span>
                                    </p>
                                </div>
                                <button
                                    className={`${styles.actionBtn} ${styles.primary}`}
                                    onClick={async () => {
                                        setLoading(true);
                                        try {
                                            const sellerId = order.seller?.ownerId;
                                            if (!sellerId) return alert('Seller info missing');
                                            const res = await fetch('/api/messages/new', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ userId: sellerId })
                                            });
                                            if (res.ok) {
                                                const { conversationId } = await res.json();
                                                window.location.href = `/messages/${conversationId}?text=${encodeURIComponent(`[order:${order.id}]`)}`;
                                            }
                                        } finally {
                                            setLoading(false);
                                        }
                                    }}
                                    disabled={loading}
                                >
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                                        Chat with Seller
                                    </span>
                                </button>
                            </div>
                        )}
                        {localStatus === 'COMPLETED' && !hasReviewed && (
                            <button
                                className={`${styles.actionBtn} ${styles.primary}`}
                                onClick={() => setShowReviewModal(true)}
                            >
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>
                                    Leave a Review
                                </span>
                            </button>
                        )}
                        {localStatus === 'SHIPPED' && (
                            <>
                                <button
                                    className={`${styles.actionBtn} ${styles.primary}`}
                                    onClick={() => {
                                        setShowOtpModal(true);
                                        setOtpCode('');
                                        setOtpSent(false);
                                        triggerOtp();
                                    }}
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
                            </>
                        )}
                    </div>
                )}

                {/* Seller action — ship */}
                {role === 'seller' && localStatus === 'CONFIRMED' && (
                    <div className={styles.orderAction}>
                        <button
                            className={`${styles.actionBtn} ${styles.primary}`}
                            onClick={() => setShowShipModal(true)}
                            disabled={loading}
                        >
                            {loading ? 'Processing…' : 'Mark as Shipped'}
                        </button>
                    </div>
                )}
            </div>

            {/* Shipping Info Modal */}
            {showShipModal && (
                <div className={styles.modalOverlay} onClick={() => setShowShipModal(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <h3 className={styles.modalTitle}>Shipping Details</h3>
                        <p className={styles.modalDesc}>Provide tracking details so the buyer can stay updated.</p>
                        <input
                            type="text"
                            className={styles.modalInput}
                            placeholder="Delivery Method (e.g. GIG, Uber, DHL)"
                            value={shipInfo.deliveryMethod}
                            onChange={(e) => setShipInfo({ ...shipInfo, deliveryMethod: e.target.value })}
                        />
                        <input
                            type="text"
                            className={styles.modalInput}
                            placeholder="Tracking Number or Phone (Optional)"
                            value={shipInfo.trackingNo}
                            onChange={(e) => setShipInfo({ ...shipInfo, trackingNo: e.target.value })}
                        />
                        <div className={styles.modalActions}>
                            <button className={`${styles.actionBtn} ${styles.ghost}`} onClick={() => setShowShipModal(false)}>Cancel</button>
                            <button
                                className={`${styles.actionBtn} ${styles.primary}`}
                                onClick={async () => {
                                    setLoading(true);
                                    try {
                                        const res = await fetch(`/api/orders/${order.id}/ship`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify(shipInfo)
                                        });
                                        if (res.ok) {
                                            setLocalStatus('SHIPPED');
                                            onStatusChange(order.id, 'SHIPPED');
                                            setShowShipModal(false);
                                        } else {
                                            const data = await res.json();
                                            alert(data.message || 'Failed to update.');
                                        }
                                    } finally {
                                        setLoading(false);
                                    }
                                }}
                                disabled={loading || !shipInfo.deliveryMethod}
                            >
                                {loading ? 'Updating…' : 'Confirm Shipment'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
            {/* Review Modal */}
            {showReviewModal && (
                <div className={styles.modalOverlay} onClick={() => setShowReviewModal(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <h3 className={styles.modalTitle}>Rate your experience</h3>
                        <p className={styles.modalDesc}>How was your order from {order.store?.name}?</p>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', margin: '12px 0' }}>
                            {[1, 2, 3, 4, 5].map(star => (
                                <button
                                    key={star}
                                    onClick={() => setReviewRating(star)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', opacity: star <= reviewRating ? 1 : 0.25, transition: 'opacity 0.15s', color: '#FFD700' }}
                                >
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="0.5"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>
                                </button>
                            ))}
                        </div>
                        <textarea
                            className={styles.disputeInput}
                            placeholder="Optional — tell others about your experience"
                            value={reviewText}
                            onChange={(e) => setReviewText(e.target.value)}
                            rows={3}
                        />
                        <div className={styles.modalActions}>
                            <button className={`${styles.actionBtn} ${styles.ghost}`} onClick={() => setShowReviewModal(false)}>Skip</button>
                            <button
                                className={`${styles.actionBtn} ${styles.primary}`}
                                disabled={reviewRating === 0 || loading}
                                onClick={async () => {
                                    setLoading(true);
                                    try {
                                        const res = await fetch('/api/reviews', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ orderId: order.id, rating: reviewRating, text: reviewText || undefined, productId: order.product?.id }),
                                        });
                                        if (res.ok) {
                                            setHasReviewed(true);
                                            setShowReviewModal(false);
                                        }
                                    } finally {
                                        setLoading(false);
                                    }
                                }}
                            >
                                {loading ? 'Submitting…' : 'Submit Review'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* OTP Modal */}
            {showOtpModal && (
                <div className={styles.modalOverlay} onClick={() => !loading && setShowOtpModal(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <h3 className={styles.modalTitle} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            Security Verification
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                        </h3>
                        <p className={styles.modalDesc}>
                            We've sent a 6-digit code to your {otpSent ? 'phone/email' : 'contact'}. Enter it below to release funds.
                        </p>

                        <input
                            type="text"
                            maxLength={6}
                            className={styles.modalInput}
                            style={{ textAlign: 'center', fontSize: '2rem', letterSpacing: '8px', fontWeight: 800 }}
                            placeholder="000000"
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        />

                        <div className={styles.modalActions}>
                            <button
                                className={`${styles.actionBtn} ${styles.ghost}`}
                                onClick={() => setShowOtpModal(false)}
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                className={`${styles.actionBtn} ${styles.primary}`}
                                onClick={handleConfirmDelivery}
                                disabled={loading || otpCode.length < 6}
                            >
                                {loading ? 'Verifying...' : 'Confirm & Release'}
                            </button>
                        </div>

                        {!loading && otpSent && (
                            <button
                                onClick={triggerOtp}
                                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.8rem', marginTop: '16px', cursor: 'pointer', fontWeight: 600, width: '100%' }}
                            >
                                Didn't receive code? Resend
                            </button>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}

export default function OrdersDashboard({ hasStore, storeName, purchases, sales }: Props) {
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState<'purchases' | 'sales'>('purchases');
    const [earnings, setEarnings] = useState<{ totalEarned: number, pendingEscrow: number, orderCount: number, pendingCount: number } | null>(null);

    useEffect(() => {
        if (activeTab === 'sales' && hasStore) {
            fetch('/api/store/earnings')
                .then(res => res.json())
                .then(data => {
                    if (!data.error) setEarnings(data);
                })
                .catch(() => { });
        }
    }, [activeTab, hasStore]);
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
                        <div className={styles.celebrationIcon}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>
                    </div>
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
                        {hasStore && earnings && (
                            <div className={styles.financialsCard}>
                                <div className={styles.financialsHeader}>
                                    <h3 className={styles.financialsTitle}>Store Earnings</h3>
                                    <Link href={`/store/${storeName?.toLowerCase().replace(/\s+/g, '-')}/settings`} className={styles.payoutBtn}>
                                        Payout Settings
                                    </Link>
                                </div>
                                <div className={styles.statsGrid}>
                                    <div className={styles.statItem}>
                                        <span className={styles.statLabel}>Total Earned</span>
                                        <span className={styles.statValue}>₦{earnings.totalEarned.toLocaleString()}</span>
                                    </div>
                                    <div className={styles.statItem}>
                                        <span className={styles.statLabel}>Pending Escrow</span>
                                        <div className={styles.pendingWrap}>
                                            <span className={styles.statValue}>₦{earnings.pendingEscrow.toLocaleString()}</span>
                                            <span className={styles.pendingBadge}>{earnings.pendingCount} orders</span>
                                        </div>
                                    </div>
                                </div>
                                <div className={styles.financialsFooter}>
                                    <p>Funds are automatically released to your bank 24h after buyer confirmation.</p>
                                </div>
                            </div>
                        )}
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
