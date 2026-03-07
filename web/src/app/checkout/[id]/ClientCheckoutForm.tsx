'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

interface Props {
    productId: string;
    total: number;
    subtotal: number;
    deliveryFee: number;
    defaultPhone: string;
    defaultAddress: string;
    defaultCity: string;
    defaultState: string;
}

type Stage = 'form' | 'submitting' | 'awaiting_payment' | 'confirmed';

interface VirtualAccount {
    accountNumber: string;
    bankName: string;
    accountName: string;
    expiresAt: string;
}

interface OrderBreakdown {
    subtotal: number;
    deliveryFee: number;
    processingFee: number;
    total: number;
}

const POLL_INTERVAL_MS = 5000;

export default function ClientCheckoutForm({
    productId, total, subtotal, deliveryFee,
    defaultPhone, defaultAddress, defaultCity, defaultState,
}: Props) {
    const router = useRouter();

    const [stage, setStage] = useState<Stage>('form');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState(defaultPhone);
    const [address, setAddress] = useState(defaultAddress);
    const [city, setCity] = useState(defaultCity);
    const [stateVal, setStateVal] = useState(defaultState);
    const [deliveryNote, setDeliveryNote] = useState('');
    const [saveDetails, setSaveDetails] = useState(true);
    const [error, setError] = useState('');

    // Post-initialize state
    const [orderId, setOrderId] = useState('');
    const [virtualAccount, setVirtualAccount] = useState<VirtualAccount | null>(null);
    const [breakdown, setBreakdown] = useState<OrderBreakdown | null>(null);
    const [secondsLeft, setSecondsLeft] = useState(30 * 60);
    const [copied, setCopied] = useState(false);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ── Resume Order Logic ───────────────────────────────────────────────────
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const params = new URLSearchParams(window.location.search);
        const resumeId = params.get('resume');
        
        if (resumeId) {
            setStage('submitting');
            fetch(`/api/checkout/resume?orderId=${resumeId}`)
                .then(res => res.json())
                .then(data => {
                    if (data.error) {
                        setError(data.error);
                        setStage('form');
                    } else {
                        setOrderId(data.orderId);
                        setVirtualAccount(data.virtualAccount);
                        setBreakdown(data.breakdown);
                        
                        // Calculate remaining time
                        const created = new Date(data.createdAt).getTime();
                        const now = Date.now();
                        const elapsedSecs = Math.floor((now - created) / 1000);
                        const totalSecs = 30 * 60;
                        const remaining = Math.max(0, totalSecs - elapsedSecs);
                        
                        setSecondsLeft(remaining);
                        if (remaining <= 0) {
                            setError('Payment window expired. Please start a new order.');
                            setStage('form');
                        } else {
                            setStage('awaiting_payment');
                        }
                    }
                })
                .catch(() => {
                    setError('Failed to resume order.');
                    setStage('form');
                });
        }
    }, []);

    // ── Countdown timer ─────────────────────────────────────────────────────
    useEffect(() => {
        if (stage !== 'awaiting_payment') return;
        const tick = setInterval(() => {
            setSecondsLeft((s) => {
                if (s <= 1) {
                    clearInterval(tick);
                    setError('Payment window expired. Please start a new order.');
                    setStage('form');
                    return 0;
                }
                return s - 1;
            });
        }, 1000);
        return () => clearInterval(tick);
    }, [stage]);

    // ── Payment polling ──────────────────────────────────────────────────────
    const pollPayment = useCallback(async (id: string) => {
        try {
            const res = await fetch(`/api/checkout/verify?orderId=${id}`);
            const data = await res.json();
            if (data.paid) {
                if (pollRef.current) clearInterval(pollRef.current);
                setStage('confirmed');
                setTimeout(() => router.push(`/orders?success=true`), 1500);
            }
        } catch {
            // Silently ignore poll failures — retry next interval
        }
    }, [router]);

    useEffect(() => {
        if (stage !== 'awaiting_payment' || !orderId) return;
        pollRef.current = setInterval(() => pollPayment(orderId), POLL_INTERVAL_MS);
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [stage, orderId, pollPayment]);

    // ── Form submit ──────────────────────────────────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!name.trim() || !phone.trim() || !address.trim() || !city.trim() || !stateVal.trim()) {
            setError('Please fill in all delivery details.');
            return;
        }

        setStage('submitting');

        try {
            const res = await fetch('/api/checkout/initialize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId,
                    quantity: 1,
                    deliveryAddress: `${address}, ${city}, ${stateVal}`,
                    deliveryNote: deliveryNote.trim() || undefined,
                    phone: phone.trim(),
                    addressLine: address.trim(),
                    city: city.trim(),
                    stateVal: stateVal.trim(),
                    saveDetails,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error ?? 'Something went wrong. Please try again.');
                setStage('form');
                return;
            }

            setOrderId(data.orderId);
            setVirtualAccount(data.virtualAccount);
            setBreakdown(data.breakdown);
            setSecondsLeft(30 * 60);
            setStage('awaiting_payment');
        } catch {
            setError('Network error. Please check your connection and try again.');
            setStage('form');
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const formatTime = (secs: number) => {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    // ── Confirmed ────────────────────────────────────────────────────────────
    if (stage === 'confirmed') {
        return (
            <div className={styles.confirmedState}>
                <div className={styles.confirmedIcon}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>
                        <path d="m9 12 2 2 4-4"/>
                    </svg>
                </div>
                <h2>Payment Received!</h2>
                <p>Your funds are safely held in escrow. The seller has been notified.</p>
            </div>
        );
    }

    // ── Awaiting payment ─────────────────────────────────────────────────────
    if (stage === 'awaiting_payment' && virtualAccount && breakdown) {
        return (
            <div className={styles.formGroup} style={{ gap: '24px' }}>
                <section className={styles.section}>
                    {/* Timer */}
                    <div className={styles.timerBanner}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                        </svg>
                        <span>Transfer within <strong>{formatTime(secondsLeft)}</strong> — account expires after that</span>
                    </div>

                    <h2 className={styles.sectionTitle}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>
                        </svg>
                        Transfer to this account
                    </h2>

                    <p className={styles.transferInstructions}>
                        Open your banking app and send the <strong>exact amount</strong> below to this account. Your order confirms automatically.
                    </p>

                    <div className={styles.bankCard}>
                        <div className={styles.bankRow}>
                            <span className={styles.bankLabel}>Bank</span>
                            <span className={styles.bankValue}>{virtualAccount.bankName}</span>
                        </div>
                        <div className={styles.bankRow}>
                            <span className={styles.bankLabel}>Account Name</span>
                            <span className={styles.bankValue}>{virtualAccount.accountName}</span>
                        </div>
                        <div className={styles.bankRowHighlight}>
                            <div>
                                <span className={styles.bankLabel}>Account Number</span>
                                <span className={styles.accountNumber}>{virtualAccount.accountNumber}</span>
                            </div>
                            <button
                                type="button"
                                className={styles.copyBtn}
                                onClick={() => copyToClipboard(virtualAccount.accountNumber)}
                            >
                                {copied ? (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12"/>
                                    </svg>
                                ) : (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                                    </svg>
                                )}
                                {copied ? 'Copied!' : 'Copy'}
                            </button>
                        </div>
                        <div className={styles.bankRowHighlight}>
                            <div>
                                <span className={styles.bankLabel}>Amount to Transfer</span>
                                <span className={styles.transferAmount}>₦{breakdown.total.toLocaleString()}</span>
                            </div>
                            <button
                                type="button"
                                className={styles.copyBtn}
                                onClick={() => copyToClipboard(breakdown.total.toString())}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                                </svg>
                                Copy
                            </button>
                        </div>
                    </div>

                    {/* Breakdown */}
                    <div className={styles.breakdownList}>
                        <div className={styles.summaryRow}>
                            <span>Items</span>
                            <span>₦{breakdown.subtotal.toLocaleString()}</span>
                        </div>
                        <div className={styles.summaryRow}>
                            <span>Delivery</span>
                            <span>₦{breakdown.deliveryFee.toLocaleString()}</span>
                        </div>
                        <div className={styles.summaryRow}>
                            <span>Processing fee (1%)</span>
                            <span>₦{breakdown.processingFee.toLocaleString()}</span>
                        </div>
                    </div>

                    <div className={styles.trustBanner} style={{ marginTop: '16px' }}>
                        <div className={styles.trustIcon}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>
                                <path d="m9 12 2 2 4-4"/>
                            </svg>
                        </div>
                        <div className={styles.trustText}>
                            <h4>DepMi Buyer Protection</h4>
                            <p>Funds are held in escrow. Seller is paid only after you confirm delivery. Transfer takes 1–2 minutes to confirm.</p>
                        </div>
                    </div>

                    {/* Polling indicator */}
                    <div className={styles.pollingIndicator}>
                        <span className={styles.pollingDot} />
                        Waiting for your transfer…
                    </div>
                </section>
            </div>
        );
    }

    // ── Delivery form ────────────────────────────────────────────────────────
    return (
        <form onSubmit={handleSubmit} className={styles.formGroup} style={{ gap: '24px' }}>
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
                    </svg>
                    Delivery Details
                </h2>

                <div className={styles.formGroup}>
                    <input className={styles.inputField} placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} required />
                    <input className={styles.inputField} placeholder="Phone Number" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                    <input className={styles.inputField} placeholder="Street Address" value={address} onChange={(e) => setAddress(e.target.value)} required />
                    <div className={styles.inputRow}>
                        <input className={styles.inputField} placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} required />
                        <input className={styles.inputField} placeholder="State" value={stateVal} onChange={(e) => setStateVal(e.target.value)} required />
                    </div>
                    <input className={styles.inputField} placeholder="Delivery note (optional)" value={deliveryNote} onChange={(e) => setDeliveryNote(e.target.value)} />
                    
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        <input 
                            type="checkbox" 
                            checked={saveDetails} 
                            onChange={(e) => setSaveDetails(e.target.checked)} 
                            style={{ accentColor: 'var(--primary)', width: '16px', height: '16px' }}
                        />
                        Save these delivery details for future orders
                    </label>
                </div>
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 18h6"/><path d="M12 14h.01"/><path d="M12 10h.01"/><path d="M12 6h.01"/>
                    </svg>
                    Order Summary
                </h2>

                <div className={styles.summaryRow}>
                    <span>Items Total</span>
                    <span>₦{subtotal.toLocaleString()}</span>
                </div>
                <div className={styles.summaryRow}>
                    <span>Delivery Fee</span>
                    <span>₦{deliveryFee.toLocaleString()}</span>
                </div>
                <div className={styles.summaryRow}>
                    <span>Processing Fee (1%, max ₦1,000)</span>
                    <span>₦{Math.min(Math.round((subtotal + deliveryFee) * 0.01), 1000).toLocaleString()}</span>
                </div>

                <div className={styles.trustBanner} style={{ marginTop: '16px' }}>
                    <div className={styles.trustIcon}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>
                            <path d="m9 12 2 2 4-4"/>
                        </svg>
                    </div>
                    <div className={styles.trustText}>
                        <h4>DepMi Buyer Protection</h4>
                        <p>Your money is held safely in escrow. The seller only gets paid after you confirm delivery.</p>
                    </div>
                </div>

                <div className={styles.summaryTotal}>
                    <span>Total to Pay</span>
                    <span style={{ color: 'var(--primary)' }}>
                        ₦{(subtotal + deliveryFee + Math.min(Math.round((subtotal + deliveryFee) * 0.01), 1000)).toLocaleString()}
                    </span>
                </div>
            </section>

            {error && <p className={styles.errorMessage}>{error}</p>}

            <div className={styles.footer}>
                <button type="submit" className={styles.payBtn} disabled={stage === 'submitting'}>
                    {stage === 'submitting' ? (
                        <>
                            <svg className="spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                            </svg>
                            Creating Secure Order…
                        </>
                    ) : (
                        <>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>
                            </svg>
                            Pay via Transfer
                        </>
                    )}
                </button>
            </div>
        </form>
    );
}
