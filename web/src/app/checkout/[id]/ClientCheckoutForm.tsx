'use client';

import React, { useState } from 'react';
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
    stock: number;
}

type Stage = 'form' | 'submitting' | 'redirecting';

export default function ClientCheckoutForm({
    productId, subtotal: itemPrice, deliveryFee: initialDeliveryFee,
    defaultPhone, defaultAddress, defaultCity, defaultState, stock,
}: Props) {
    const [stage, setStage] = useState<Stage>('form');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState(defaultPhone);
    const [address, setAddress] = useState(defaultAddress);
    const [city, setCity] = useState(defaultCity);
    const [stateVal, setStateVal] = useState(defaultState);
    const [deliveryNote, setDeliveryNote] = useState('');
    const [saveDetails, setSaveDetails] = useState(true);
    const [quantity, setQuantity] = useState(1);
    const [deliveryMethod, setDeliveryMethod] = useState<'DELIVERY' | 'PICKUP'>('DELIVERY');
    const [error, setError] = useState('');

    const currentDeliveryFee = deliveryMethod === 'PICKUP' ? 0 : initialDeliveryFee;
    const currentSubtotal = itemPrice * quantity;
    const finalTotal = currentSubtotal + currentDeliveryFee;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (deliveryMethod === 'DELIVERY' && (!name.trim() || !phone.trim() || !address.trim() || !city.trim() || !stateVal.trim())) {
            setError('Please fill in all delivery details.');
            return;
        }
        if (deliveryMethod === 'PICKUP' && !phone.trim()) {
            setError('Please provide a phone number for the seller to contact you.');
            return;
        }

        setStage('submitting');

        try {
            const res = await fetch('/api/checkout/initialize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId,
                    quantity,
                    deliveryMethod,
                    deliveryAddress: deliveryMethod === 'PICKUP' ? 'PICKUP' : `${address}, ${city}, ${stateVal}`,
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

            setStage('redirecting');
            window.location.href = data.paymentLink;
        } catch {
            setError('Network error. Please check your connection and try again.');
            setStage('form');
        }
    };

    if (stage === 'redirecting') {
        return (
            <div className={styles.confirmedState}>
                <div className={styles.confirmedIcon}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                </div>
                <h2>Redirecting to secure payment…</h2>
                <p>You'll be taken to Flutterwave to complete your payment safely.</p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className={styles.formGroup} style={{ gap: '24px' }}>
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
                    </svg>
                    Delivery Details
                </h2>

                <div className={styles.methodToggle}>
                    <button type="button" className={`${styles.methodBtn} ${deliveryMethod === 'DELIVERY' ? styles.methodBtnActive : ''}`} onClick={() => setDeliveryMethod('DELIVERY')}>Delivery</button>
                    <button type="button" className={`${styles.methodBtn} ${deliveryMethod === 'PICKUP' ? styles.methodBtnActive : ''}`} onClick={() => setDeliveryMethod('PICKUP')}>Pickup</button>
                </div>

                <div className={styles.formGroup}>
                    <div className={styles.qtyContainer}>
                        <span className={styles.qtyLabel}>Quantity</span>
                        <div className={styles.qtySelector}>
                            <button type="button" className={styles.qtyBtn} onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1}>-</button>
                            <span className={styles.qtyValue}>{quantity}</span>
                            <button type="button" className={styles.qtyBtn} onClick={() => setQuantity(Math.min(stock, quantity + 1))} disabled={quantity >= stock}>+</button>
                        </div>
                    </div>

                    {deliveryMethod === 'DELIVERY' ? (
                        <>
                            <input className={styles.inputField} placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} required />
                            <input className={styles.inputField} placeholder="Phone Number" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                            <input className={styles.inputField} placeholder="Street Address" value={address} onChange={(e) => setAddress(e.target.value)} required />
                            <div className={styles.inputRow}>
                                <input className={styles.inputField} placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} required />
                                <input className={styles.inputField} placeholder="State" value={stateVal} onChange={(e) => setStateVal(e.target.value)} required />
                            </div>
                        </>
                    ) : (
                        <div className={styles.pickupNotice}>
                            <p>You'll need to contact the seller to arrange a pickup location after payment.</p>
                        </div>
                    )}

                    <input className={styles.inputField} placeholder="Delivery note (optional)" value={deliveryNote} onChange={(e) => setDeliveryNote(e.target.value)} />

                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        <input type="checkbox" checked={saveDetails} onChange={(e) => setSaveDetails(e.target.checked)} style={{ accentColor: 'var(--primary)', width: '16px', height: '16px' }} />
                        Save these delivery details for future orders
                    </label>
                </div>
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="16" height="20" x="4" y="2" rx="2" ry="2" /><path d="M9 18h6" /><path d="M12 14h.01" /><path d="M12 10h.01" /><path d="M12 6h.01" />
                    </svg>
                    Order Summary
                </h2>

                <div className={styles.summaryRow}><span>Items ({quantity})</span><span>₦{currentSubtotal.toLocaleString()}</span></div>
                <div className={styles.summaryRow}><span>Delivery</span><span>₦{currentDeliveryFee.toLocaleString()}</span></div>

                <div className={styles.trustBanner} style={{ marginTop: '16px' }}>
                    <div className={styles.trustIcon}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /><path d="m9 12 2 2 4-4" />
                        </svg>
                    </div>
                    <div className={styles.trustText}>
                        <h4>DepMi Buyer Protection</h4>
                        <p>Pay securely via card, bank transfer, or USSD. Seller is paid only after you confirm delivery.</p>
                    </div>
                </div>

                <div className={styles.summaryTotal}>
                    <span>Total to Pay</span>
                    <span style={{ color: 'var(--primary)' }}>₦{finalTotal.toLocaleString()}</span>
                </div>
            </section>

            {error && <p className={styles.errorMessage}>{error}</p>}

            <div className={styles.footer}>
                <button type="submit" className={styles.payBtn} disabled={stage === 'submitting'}>
                    {stage === 'submitting' ? (
                        <>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                            </svg>
                            Creating Secure Order…
                        </>
                    ) : (
                        <>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" x2="22" y1="10" y2="10" />
                            </svg>
                            Pay Now — Card, Bank or USSD
                        </>
                    )}
                </button>
            </div>
        </form>
    );
}
