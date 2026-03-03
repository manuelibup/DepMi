'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import styles from './page.module.css';

interface Props {
    hasStore: boolean;
    storeName?: string;
}

export default function OrdersDashboard({ hasStore, storeName }: Props) {
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState<'purchases' | 'sales'>('purchases');
    const [showCelebration, setShowCelebration] = useState(false);

    useEffect(() => {
        if (searchParams?.get('success') === 'true') {
            setShowCelebration(true);
            setTimeout(() => setShowCelebration(false), 8000); // Hide after 8s
        }
    }, [searchParams]);

    return (
        <div className={styles.main}>
            {/* Tabs */}
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
                        Store Sales ({storeName})
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
                        {/* Mock Active Order */}
                        <div className={styles.orderCard}>
                            <div className={styles.orderHeader}>
                                <p className={styles.orderId}>ORDER #DPM-892HA4</p>
                                <span className={`${styles.statusBadge} ${styles.status_ESCROW_HELD}`}>Escrow Held</span>
                            </div>
                            <div className={styles.orderItem}>
                                <div className={styles.itemImage}>
                                    <span style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>👟</span>
                                </div>
                                <div className={styles.itemInfo}>
                                    <h4 className={styles.itemTitle}>Nike Air Jordan 1 Retro H...</h4>
                                    <p className={styles.itemMeta}>Sold by: HypeLagos</p>
                                    <p className={styles.itemPrice}>₦125,000</p>
                                </div>
                            </div>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 8px' }}>Tracking: Awaiting Seller Shipment</p>
                            <div className={styles.orderAction}>
                                <button className={styles.actionBtn} disabled>Mark as Received</button>
                            </div>
                        </div>

                        {/* Mock Shipped Order */}
                        <div className={styles.orderCard}>
                            <div className={styles.orderHeader}>
                                <p className={styles.orderId}>ORDER #DPM-722BB1</p>
                                <span className={`${styles.statusBadge} ${styles.status_SHIPPED}`}>Shipped</span>
                            </div>
                            <div className={styles.orderItem}>
                                <div className={styles.itemImage}>
                                    <span style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>💻</span>
                                </div>
                                <div className={styles.itemInfo}>
                                    <h4 className={styles.itemTitle}>MacBook Pro M2 (Used)</h4>
                                    <p className={styles.itemMeta}>Sold by: TechHub Ikeja</p>
                                    <p className={styles.itemPrice}>₦850,000</p>
                                </div>
                            </div>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 8px' }}>Tracking GIGL: GB90283921</p>
                            <div className={styles.orderAction}>
                                <button className={`${styles.actionBtn} ${styles.primary}`}>Mark as Received</button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {/* Mock Seller Inbound Order */}
                        <div className={styles.orderCard}>
                            <div className={styles.orderHeader}>
                                <p className={styles.orderId}>SALE #DPM-449XQ9</p>
                                <span className={`${styles.statusBadge} ${styles.status_ESCROW_HELD}`}>To Ship</span>
                            </div>
                            <div className={styles.orderItem}>
                                <div className={styles.itemImage}>
                                    <span style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>👗</span>
                                </div>
                                <div className={styles.itemInfo}>
                                    <h4 className={styles.itemTitle}>Vintage Silk Dress</h4>
                                    <p className={styles.itemMeta}>Buyer: @chic_jane</p>
                                    <p className={styles.itemPrice}>₦45,000</p>
                                </div>
                            </div>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 8px' }}>Funds are secured in Escrow. Please ship the item to receive payout.</p>
                            <div className={styles.orderAction}>
                                <button className={`${styles.actionBtn} ${styles.primary}`}>Add Tracking & Ship</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
