'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import styles from './page.module.css';

interface OrderItem {
    id: string;
    status: string;
    escrowStatus: string;
    total: number;
    createdAt: string;
    product: { id: string; title: string; images: { url: string }[] };
    store?: { name: string; ownerId?: string };
    seller?: { name: string; ownerId: string };
    buyer?: { displayName: string; username: string };
    trackingNo?: string;
    deliveryMethod?: string;
    hasReviewed?: boolean;
    paystackRef?: string | null;
}

interface Props {
    hasStore: boolean;
    storeName?: string;
    storeSlug?: string;
    purchases: OrderItem[];
    sales: OrderItem[];
}

const STATUS_LABELS: Record<string, string> = {
    PENDING: 'Pending Payment',
    EXPIRED: 'Expired',
    PAYMENT_VERIFYING: 'Verifying Payment',
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

const FILTER_GROUPS = [
    { label: 'All', values: [] as string[] },
    { label: 'Active', values: ['CONFIRMED', 'SHIPPED', 'DELIVERED'] },
    { label: 'Pending', values: ['PENDING', 'PAYMENT_VERIFYING'] },
    { label: 'Completed', values: ['COMPLETED'] },
    { label: 'Issues', values: ['DISPUTED', 'CANCELLED', 'EXPIRED', 'REFUNDED', 'RESOLVED_BUYER', 'RESOLVED_VENDOR'] },
];

type TimelineStep = { label: string; key: string };
const BUYER_STEPS: TimelineStep[] = [
    { label: 'Placed', key: 'PENDING' },
    { label: 'Paid', key: 'CONFIRMED' },
    { label: 'Shipped', key: 'SHIPPED' },
    { label: 'Received', key: 'COMPLETED' },
];
const STATUS_ORDER = ['PENDING', 'PAYMENT_VERIFYING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'COMPLETED'];

function getStepState(stepKey: string, stepIdx: number, currentStatus: string): 'done' | 'current' | 'pending' {
    const currentIdx = STATUS_ORDER.indexOf(currentStatus);
    const stepStatusIdx = STATUS_ORDER.indexOf(stepKey === 'COMPLETED' ? 'COMPLETED' : stepKey);
    if (currentIdx > stepStatusIdx) return 'done';
    if (currentIdx === stepStatusIdx) return 'current';
    // special cases
    if (currentStatus === 'DELIVERED' && stepKey === 'SHIPPED') return 'done';
    if (['SHIPPED', 'DELIVERED'].includes(currentStatus) && stepKey === 'CONFIRMED') return 'done';
    return 'pending';
}

function Badge({ status }: { status: string }) {
    const cls = (styles as Record<string, string>)[`badge_${status}`] || '';
    return <span className={`${styles.badge} ${cls}`}>{STATUS_LABELS[status] ?? status}</span>;
}

function OrderRow({ order, selected, role, onClick }: {
    order: OrderItem; selected: boolean; role: 'buyer' | 'seller'; onClick: () => void;
}) {
    const img = order.product.images[0]?.url;
    const shortId = order.id.slice(-6).toUpperCase();
    const who = role === 'buyer'
        ? (order.store?.name ?? '—')
        : `@${order.buyer?.username ?? order.buyer?.displayName ?? '—'}`;

    return (
        <div
            className={`${styles.orderRow}${selected ? ' ' + styles.selected : ''}`}
            onClick={onClick}
            role="button"
        >
            <div className={styles.rowThumb}>
                {img
                    ? <Image src={img} alt="" width={48} height={48} style={{ objectFit: 'cover' }} />
                    : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity={0.3}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></svg>
                }
            </div>
            <div className={styles.rowBody}>
                <p className={styles.rowTitle}>{order.product.title}</p>
                <p className={styles.rowMeta}>#{shortId} · {who}</p>
                <div className={styles.rowBottom}>
                    <span className={styles.rowAmount}>₦{order.total.toLocaleString()}</span>
                    <Badge status={order.status} />
                    <span className={styles.rowDate}>{new Date(order.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}</span>
                </div>
            </div>
        </div>
    );
}

function OrderDetail({ order, role, onStatusChange, onClose }: {
    order: OrderItem;
    role: 'buyer' | 'seller';
    onStatusChange: (id: string, status: string) => void;
    onClose?: () => void;
}) {
    const [localStatus, setLocalStatus] = useState(order.status);
    const [loading, setLoading] = useState(false);
    const [modal, setModal] = useState<'ship' | 'dispute' | 'otp' | 'review' | null>(null);
    const [otpSent, setOtpSent] = useState(false);
    const [otpCode, setOtpCode] = useState('');
    const [disputeReason, setDisputeReason] = useState('');
    const [shipInfo, setShipInfo] = useState({ trackingNo: '', deliveryMethod: '' });
    const [reviewRating, setReviewRating] = useState(0);
    const [reviewText, setReviewText] = useState('');
    const [hasReviewed, setHasReviewed] = useState(order.hasReviewed ?? false);

    useEffect(() => {
        setLocalStatus(order.status);
        setHasReviewed(order.hasReviewed ?? false);
        setModal(null);
    }, [order.id, order.status, order.hasReviewed]);

    useEffect(() => {
        if (localStatus === 'PENDING') {
            const age = Date.now() - new Date(order.createdAt).getTime();
            if (age > 15 * 60 * 1000) setLocalStatus(order.paystackRef ? 'PAYMENT_VERIFYING' : 'EXPIRED');
        }
    }, [localStatus, order.createdAt, order.paystackRef]);

    const push = (s: string) => { setLocalStatus(s); onStatusChange(order.id, s); };

    const triggerOtp = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/otp/send', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'TRANSACTIONAL' }),
            });
            if (res.ok) { setOtpSent(true); }
            else { const d = await res.json(); alert(d.error || 'Failed to send code.'); setModal(null); }
        } finally { setLoading(false); }
    }, []);

    const handleConfirm = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/orders/${order.id}/confirm`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: otpCode }),
            });
            const d = await res.json();
            if (res.ok) { push('COMPLETED'); setModal(null); }
            else alert(d.error ?? 'Verification failed.');
        } catch { alert('Network error.'); }
        finally { setLoading(false); }
    };

    const handleDispute = async () => {
        if (!disputeReason.trim()) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/orders/${order.id}/dispute`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: disputeReason }),
            });
            const d = await res.json();
            if (res.ok) { push('DISPUTED'); setModal(null); }
            else alert(d.error ?? 'Failed.');
        } catch { alert('Network error.'); }
        finally { setLoading(false); }
    };

    const handleShip = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/orders/${order.id}/ship`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(shipInfo),
            });
            if (res.ok) { push('SHIPPED'); setModal(null); }
            else { const d = await res.json(); alert(d.message || 'Failed.'); }
        } finally { setLoading(false); }
    };

    const handleVerify = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/orders/${order.id}/verify`, { method: 'POST' });
            const d = await res.json();
            if (res.ok && d.success) { push('CONFIRMED'); window.dispatchEvent(new Event('refresh_earnings')); }
            else alert(d.message || d.error || 'Verification failed.');
        } catch { alert('Network error.'); }
        finally { setLoading(false); }
    };

    const handleCancel = async () => {
        if (!confirm('Cancel this order?')) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/orders/${order.id}/cancel`, { method: 'POST' });
            if (res.ok) push('CANCELLED');
            else { const d = await res.json(); alert(d.error || 'Failed.'); }
        } finally { setLoading(false); }
    };

    const openOtp = () => { setOtpCode(''); setOtpSent(false); setModal('otp'); triggerOtp(); };

    const showTimeline = !['CANCELLED', 'EXPIRED', 'DISPUTED', 'REFUNDED', 'RESOLVED_BUYER', 'RESOLVED_VENDOR'].includes(localStatus);
    const img = order.product.images[0]?.url;
    const shortId = order.id.slice(-6).toUpperCase();

    return (
        <>
            {onClose && (
                <button className={styles.mobileBack} onClick={onClose}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                    Back to orders
                </button>
            )}

            <div className={onClose ? styles.mobileDetailWrap : ''}>
                {/* Header */}
                <div className={styles.detailHeader}>
                    <div>
                        <p className={styles.detailOrderId}>Order #{shortId}</p>
                        <p className={styles.detailStatus}>{STATUS_LABELS[localStatus] ?? localStatus}</p>
                        <p className={styles.detailDate}>{new Date(order.createdAt).toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                    <Badge status={localStatus} />
                </div>

                {/* Timeline */}
                {showTimeline && (
                    <div className={styles.timeline}>
                        {BUYER_STEPS.map((step, i) => {
                            const state = getStepState(step.key, i, localStatus);
                            return (
                                <React.Fragment key={step.key}>
                                    <div className={styles.timelineStep}>
                                        <div className={`${styles.timelineDot}${state === 'done' ? ' ' + styles.done : state === 'current' ? ' ' + styles.current : ''}`}>
                                            {state === 'done'
                                                ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                                : <span style={{ fontSize: '0.6rem', fontWeight: 700 }}>{i + 1}</span>
                                            }
                                        </div>
                                        <span className={`${styles.timelineLabel}${state === 'done' ? ' ' + styles.done : state === 'current' ? ' ' + styles.current : ''}`}>{step.label}</span>
                                    </div>
                                    {i < BUYER_STEPS.length - 1 && (
                                        <div className={`${styles.timelineLine}${state === 'done' ? ' ' + styles.done : ''}`} />
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>
                )}

                {/* Product */}
                <Link href={order.product.id ? `/p/${order.product.id}` : '#'} className={styles.detailProduct}>
                    <div className={styles.detailProductImg}>
                        {img
                            ? <Image src={img} alt={order.product.title} width={72} height={72} style={{ objectFit: 'cover' }} />
                            : <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity={0.3}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></svg>
                        }
                    </div>
                    <div className={styles.detailProductInfo}>
                        <p className={styles.detailProductTitle}>{order.product.title}</p>
                        <p className={styles.detailProductSub}>
                            {role === 'buyer' ? `Store: ${order.store?.name ?? '—'}` : `Buyer: @${order.buyer?.username ?? order.buyer?.displayName ?? '—'}`}
                        </p>
                        <p className={styles.detailProductPrice}>₦{order.total.toLocaleString()}</p>
                    </div>
                </Link>

                {/* Tracking */}
                {(order.trackingNo || order.deliveryMethod) && !['PENDING', 'CONFIRMED', 'CANCELLED'].includes(localStatus) && (
                    <div className={styles.trackingBanner}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0984E3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>
                        <p>
                            <strong>{order.deliveryMethod || 'Shipped'}</strong>
                            {order.trackingNo && <> · Tracking: <strong>{order.trackingNo}</strong></>}
                        </p>
                    </div>
                )}

                {/* Info */}
                <div className={styles.infoCard}>
                    <p className={styles.infoCardTitle}>Order Details</p>
                    {[
                        ['Order ID', `#${shortId}`],
                        ['Date', new Date(order.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })],
                        ['Amount', `₦${order.total.toLocaleString()}`],
                        ['Escrow', order.escrowStatus],
                        role === 'buyer' ? ['Seller', order.store?.name ?? '—'] : ['Buyer', `@${order.buyer?.username ?? order.buyer?.displayName ?? '—'}`],
                    ].map(([k, v]) => (
                        <div key={k} className={styles.infoRow}>
                            <span className={styles.infoKey}>{k}</span>
                            <span className={styles.infoVal} style={k === 'Order ID' ? { fontFamily: 'monospace' } : undefined}>{v}</span>
                        </div>
                    ))}
                </div>

                {/* Buyer actions */}
                {role === 'buyer' && (
                    <div className={styles.actionZone}>
                        {localStatus === 'PENDING' && (<>
                            <Link href={`/checkout/${order.product.id}?resume=${order.id}`} className={`${styles.btn} ${styles.btnPrimary}`} style={{ textDecoration: 'none' }}>
                                Resume Checkout
                            </Link>
                            <button className={`${styles.btn} ${styles.btnGhost}`} onClick={handleVerify} disabled={loading}>
                                {loading ? 'Checking…' : 'Verify Payment'}
                            </button>
                            <button className={`${styles.btn} ${styles.btnDanger}`} onClick={handleCancel} disabled={loading} style={{ width: '100%' }}>
                                Cancel Order
                            </button>
                        </>)}

                        {localStatus === 'PAYMENT_VERIFYING' && (
                            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <div className={styles.warnBanner}><p><strong>Payment detected.</strong> Tap below to confirm with Flutterwave.</p></div>
                                <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleVerify} disabled={loading}>
                                    {loading ? 'Checking…' : 'Verify Payment'}
                                </button>
                            </div>
                        )}

                        {['CONFIRMED', 'SHIPPED', 'DELIVERED'].includes(localStatus) && (
                            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <div className={styles.infoBanner}>
                                    <p><strong>Payment confirmed.</strong> Seller notified. Chat to coordinate delivery.</p>
                                </div>
                                <div className={styles.actionZone}>
                                    <button className={`${styles.btn} ${styles.btnGhost}`} onClick={async () => {
                                        const sellerId = order.seller?.ownerId;
                                        if (!sellerId) return;
                                        setLoading(true);
                                        try {
                                            const res = await fetch('/api/messages/new', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: sellerId }) });
                                            if (res.ok) { const { conversationId } = await res.json(); window.location.href = `/messages/${conversationId}?text=${encodeURIComponent(`[order:${order.id}]`)}`; }
                                        } finally { setLoading(false); }
                                    }} disabled={loading}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                                        Chat with Seller
                                    </button>
                                    {['SHIPPED', 'DELIVERED'].includes(localStatus) && (
                                        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={openOtp} disabled={loading}>
                                            Mark as Received
                                        </button>
                                    )}
                                </div>
                                {['SHIPPED', 'DELIVERED'].includes(localStatus) && (
                                    <button className={`${styles.btn} ${styles.btnDanger}`} onClick={() => setModal('dispute')} disabled={loading} style={{ width: '100%' }}>
                                        Open Dispute
                                    </button>
                                )}
                            </div>
                        )}

                        {localStatus === 'COMPLETED' && !hasReviewed && (
                            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setModal('review')}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" /></svg>
                                Leave a Review
                            </button>
                        )}
                    </div>
                )}

                {/* Seller actions */}
                {role === 'seller' && localStatus === 'CONFIRMED' && (
                    <div className={styles.actionZone}>
                        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setModal('ship')} disabled={loading}>
                            Mark as Shipped
                        </button>
                    </div>
                )}
            </div>

            {/* Modals */}
            {modal === 'ship' && (
                <div className={styles.overlay} onClick={() => setModal(null)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <h3 className={styles.modalTitle}>Shipping Details</h3>
                        <p className={styles.modalDesc}>Give the buyer tracking info so they can follow their order.</p>
                        <input className={styles.input} placeholder="Delivery method (e.g. GIG, Uber, DHL)" value={shipInfo.deliveryMethod} onChange={e => setShipInfo(s => ({ ...s, deliveryMethod: e.target.value }))} />
                        <input className={styles.input} placeholder="Tracking number or phone (optional)" value={shipInfo.trackingNo} onChange={e => setShipInfo(s => ({ ...s, trackingNo: e.target.value }))} />
                        <div className={styles.modalActions}>
                            <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setModal(null)}>Cancel</button>
                            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleShip} disabled={loading || !shipInfo.deliveryMethod}>
                                {loading ? 'Updating…' : 'Confirm Shipment'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {modal === 'dispute' && (
                <div className={styles.overlay} onClick={() => setModal(null)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <h3 className={styles.modalTitle}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                            Open a Dispute
                        </h3>
                        <p className={styles.modalDesc}>Funds will be frozen until our team reviews. Be specific.</p>
                        <textarea className={styles.textarea} rows={4} placeholder="e.g. Item not delivered, wrong item, damaged…" value={disputeReason} onChange={e => setDisputeReason(e.target.value)} />
                        <div className={styles.modalActions}>
                            <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setModal(null)} disabled={loading}>Cancel</button>
                            <button className={`${styles.btn} ${styles.btnDanger}`} onClick={handleDispute} disabled={loading || !disputeReason.trim()}>
                                {loading ? 'Submitting…' : 'Submit Dispute'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {modal === 'otp' && (
                <div className={styles.overlay} onClick={() => !loading && setModal(null)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <h3 className={styles.modalTitle}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                            Security Verification
                        </h3>
                        <p className={styles.modalDesc}>
                            {otpSent ? 'A 6-digit code was sent to your phone/email. Enter it to release funds to the seller.' : 'Sending code…'}
                        </p>
                        <input className={styles.otpInput} type="text" maxLength={6} placeholder="000000" value={otpCode} onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))} />
                        <div className={styles.modalActions}>
                            <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setModal(null)} disabled={loading}>Cancel</button>
                            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleConfirm} disabled={loading || otpCode.length < 6}>
                                {loading ? 'Verifying…' : 'Confirm & Release'}
                            </button>
                        </div>
                        {!loading && otpSent && (
                            <button onClick={triggerOtp} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600, marginTop: 4 }}>
                                Didn&apos;t receive it? Resend
                            </button>
                        )}
                    </div>
                </div>
            )}

            {modal === 'review' && (
                <div className={styles.overlay} onClick={() => setModal(null)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <h3 className={styles.modalTitle}>Rate your experience</h3>
                        <p className={styles.modalDesc}>How was your order from {order.store?.name}?</p>
                        <div className={styles.stars}>
                            {[1, 2, 3, 4, 5].map(s => (
                                <button key={s} className={`${styles.star}${s > reviewRating ? ' ' + styles.off : ''}`} onClick={() => setReviewRating(s)}>
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" /></svg>
                                </button>
                            ))}
                        </div>
                        <textarea className={styles.textarea} rows={3} placeholder="Optional — tell others about your experience" value={reviewText} onChange={e => setReviewText(e.target.value)} />
                        <div className={styles.modalActions}>
                            <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setModal(null)}>Skip</button>
                            <button className={`${styles.btn} ${styles.btnPrimary}`} disabled={reviewRating === 0 || loading} onClick={async () => {
                                setLoading(true);
                                try {
                                    const res = await fetch('/api/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId: order.id, rating: reviewRating, text: reviewText || undefined, productId: order.product?.id }) });
                                    if (res.ok) { setHasReviewed(true); setModal(null); }
                                } finally { setLoading(false); }
                            }}>
                                {loading ? 'Submitting…' : 'Submit Review'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default function OrdersDashboard({ hasStore, storeName, storeSlug, purchases, sales }: Props) {
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState<'purchases' | 'sales'>('purchases');
    const [activeFilter, setActiveFilter] = useState(0);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [showMobileDetail, setShowMobileDetail] = useState(false);
    const [localPurchases, setLocalPurchases] = useState(purchases);
    const [localSales, setLocalSales] = useState(sales);
    const [earnings, setEarnings] = useState<{ totalEarned: number; pendingEscrow: number; orderCount: number; pendingCount: number } | null>(null);
    const [showCelebration, setShowCelebration] = useState(false);

    useEffect(() => {
        if (searchParams?.get('success') === 'true') {
            setTimeout(() => setShowCelebration(true), 0);
            setTimeout(() => setShowCelebration(false), 8000);
        }
    }, [searchParams]);

    useEffect(() => {
        if (activeTab === 'sales' && hasStore) {
            fetch('/api/store/earnings').then(r => r.json()).then(d => { if (!d.error) setEarnings(d); }).catch(() => { });
        }
    }, [activeTab, hasStore]);

    const handleStatusChange = (id: string, s: string) => {
        setLocalPurchases(prev => prev.map(o => o.id === id ? { ...o, status: s } : o));
        setLocalSales(prev => prev.map(o => o.id === id ? { ...o, status: s } : o));
    };

    const orders = activeTab === 'purchases' ? localPurchases : localSales;
    const filterGroup = FILTER_GROUPS[activeFilter];
    const filtered = filterGroup.values.length === 0 ? orders : orders.filter(o => filterGroup.values.includes(o.status));

    const activeId = selectedId ?? filtered[0]?.id ?? null;
    const selectedOrder = filtered.find(o => o.id === activeId) ?? null;

    const handleSelect = (id: string) => { setSelectedId(id); setShowMobileDetail(true); };
    const handleTabChange = (tab: 'purchases' | 'sales') => { setActiveTab(tab); setSelectedId(null); setShowMobileDetail(false); };

    // On mobile, if detail is shown hide the list
    const listHidden = showMobileDetail;

    return (
        <div className={styles.shell}>
            <div className={styles.desktopLayout}>
                {/* LEFT: order list */}
                <div className={styles.listPanel} style={listHidden ? { display: 'none' } : undefined}>
                    <div className={styles.listPanelHeader}>
                        <h1 className={styles.listTitle}>Orders</h1>
                        <div className={styles.tabs}>
                            <button className={`${styles.tab}${activeTab === 'purchases' ? ' ' + styles.active : ''}`} onClick={() => handleTabChange('purchases')}>
                                Purchases
                            </button>
                            {hasStore && (
                                <button className={`${styles.tab}${activeTab === 'sales' ? ' ' + styles.active : ''}`} onClick={() => handleTabChange('sales')}>
                                    Sales{storeName ? ` · ${storeName}` : ''}
                                </button>
                            )}
                        </div>
                    </div>

                    <div className={styles.filterRow}>
                        {FILTER_GROUPS.map((g, i) => (
                            <button key={g.label} className={`${styles.filterChip}${activeFilter === i ? ' ' + styles.active : ''}`} onClick={() => { setActiveFilter(i); setSelectedId(null); }}>
                                {g.label}
                            </button>
                        ))}
                    </div>

                    {/* Sales earnings strip */}
                    {activeTab === 'sales' && earnings && (
                        <div style={{ padding: '12px 12px 0' }}>
                            <div className={`${styles.financialsStrip} ${styles.twoCol}`}>
                                <div className={styles.statBox}>
                                    <div className={styles.statLabel}>Total Earned</div>
                                    <div className={styles.statValue} style={{ fontSize: '1.1rem' }}>₦{earnings.totalEarned.toLocaleString()}</div>
                                </div>
                                <div className={styles.statBox}>
                                    <div className={styles.statLabel}>In Escrow</div>
                                    <div className={styles.statValue} style={{ fontSize: '1.1rem' }}>₦{earnings.pendingEscrow.toLocaleString()}</div>
                                    <div className={styles.statSub}>{earnings.pendingCount} pending</div>
                                </div>
                            </div>
                            {storeSlug && (
                                <div style={{ padding: '8px 4px 10px', display: 'flex', justifyContent: 'flex-end' }}>
                                    <Link href={`/store/${storeSlug}/settings`} className={styles.payoutLink}>Payout Settings →</Link>
                                </div>
                            )}
                        </div>
                    )}

                    <div className={styles.orderList}>
                        {showCelebration && activeTab === 'purchases' && (
                            <div className={styles.celebration} style={{ margin: '10px 12px 4px' }}>
                                <div>
                                    <h3>Order Placed!</h3>
                                    <p>Funds locked in DepMi Escrow. Seller has been notified.</p>
                                </div>
                            </div>
                        )}
                        {filtered.length === 0 ? (
                            <div className={styles.emptyList}>
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" opacity={0.15}><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>
                                <p>No {filterGroup.values.length ? `"${filterGroup.label}"` : ''} {activeTab === 'purchases' ? 'purchases' : 'sales'} yet</p>
                            </div>
                        ) : (
                            filtered.map(o => (
                                <OrderRow
                                    key={o.id}
                                    order={o}
                                    role={activeTab === 'purchases' ? 'buyer' : 'seller'}
                                    selected={o.id === activeId}
                                    onClick={() => handleSelect(o.id)}
                                />
                            ))
                        )}
                    </div>
                </div>

                {/* RIGHT: detail panel (desktop only via CSS) */}
                <div className={styles.detailPanel}>
                    {selectedOrder ? (
                        <OrderDetail key={selectedOrder.id} order={selectedOrder} role={activeTab === 'purchases' ? 'buyer' : 'seller'} onStatusChange={handleStatusChange} />
                    ) : (
                        <div className={styles.emptyDetail}>
                            <div className={styles.emptyDetailIcon}>
                                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>
                            </div>
                            <p className={styles.emptyDetailText}>Select an order to view details</p>
                        </div>
                    )}
                </div>

                {/* Mobile detail overlay */}
                {showMobileDetail && selectedOrder && (
                    <div style={{ width: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                        <OrderDetail
                            key={selectedOrder.id}
                            order={selectedOrder}
                            role={activeTab === 'purchases' ? 'buyer' : 'seller'}
                            onStatusChange={handleStatusChange}
                            onClose={() => { setShowMobileDetail(false); setSelectedId(null); }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
