'use client';

import { useState } from 'react';
import styles from './DisputeQueue.module.css';

type Dispute = {
    id: string;
    totalAmount: number;
    createdAt: string;
    updatedAt: string;
    buyer: { id: string; displayName: string; email: string | null; avatarUrl: string | null };
    seller: { id: string; name: string; slug: string; logoUrl: string | null };
    items: { product: { title: string } | null }[];
};

type Resolution = 'RESOLVED_BUYER' | 'RESOLVED_VENDOR' | 'REFUNDED';

function daysSince(iso: string) {
    return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

export default function DisputeQueue({ initial }: { initial: Dispute[] }) {
    const [disputes, setDisputes] = useState(initial);
    const [resolving, setResolving] = useState<string | null>(null);
    const [open, setOpen] = useState<string | null>(null);

    async function resolve(orderId: string, resolution: Resolution) {
        setResolving(orderId);
        try {
            const res = await fetch(`/api/admin/orders/${orderId}/resolve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ resolution }),
            });
            if (res.ok) {
                setDisputes(prev => prev.filter(d => d.id !== orderId));
                setOpen(null);
            }
        } finally {
            setResolving(null);
        }
    }

    if (!disputes.length) {
        return <p className={styles.empty}>No active disputes.</p>;
    }

    return (
        <div className={styles.list}>
            {disputes.map(d => (
                <div key={d.id} className={styles.row}>
                    <div className={styles.meta}>
                        <span className={styles.orderId}>#{d.id.slice(-8)}</span>
                        <span className={styles.product}>{d.items[0]?.product?.title ?? 'Order'}</span>
                        <span className={styles.amount}>₦{d.totalAmount.toLocaleString()}</span>
                        <span className={styles.age}>{daysSince(d.updatedAt)}d ago</span>
                    </div>
                    <div className={styles.parties}>
                        <span>Buyer: <strong>{d.buyer.displayName}</strong></span>
                        <span>Seller: <strong>{d.seller.name}</strong></span>
                    </div>
                    <div className={styles.actions}>
                        {open === d.id ? (
                            <div className={styles.resolveBar}>
                                <button
                                    className={`${styles.btn} ${styles.btnBuyer}`}
                                    disabled={resolving === d.id}
                                    onClick={() => resolve(d.id, 'RESOLVED_BUYER')}>
                                    Favour Buyer
                                </button>
                                <button
                                    className={`${styles.btn} ${styles.btnVendor}`}
                                    disabled={resolving === d.id}
                                    onClick={() => resolve(d.id, 'RESOLVED_VENDOR')}>
                                    Favour Seller
                                </button>
                                <button
                                    className={`${styles.btn} ${styles.btnRefund}`}
                                    disabled={resolving === d.id}
                                    onClick={() => resolve(d.id, 'REFUNDED')}>
                                    Refund
                                </button>
                                <button className={styles.btnCancel} onClick={() => setOpen(null)}>Cancel</button>
                            </div>
                        ) : (
                            <button className={`${styles.btn} ${styles.btnResolve}`} onClick={() => setOpen(d.id)}>
                                Resolve
                            </button>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
