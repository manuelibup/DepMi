'use client';

import React, { useState } from 'react';
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

export default function ClientCheckoutForm({ productId, total, subtotal, deliveryFee, defaultPhone, defaultAddress, defaultCity, defaultState }: Props) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Address State
    const [name, setName] = useState('');
    const [phone, setPhone] = useState(defaultPhone);
    const [address, setAddress] = useState(defaultAddress);
    const [city, setCity] = useState(defaultCity);
    const [state, setState] = useState(defaultState);

    const handlePayClick = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!name || !phone || !address || !city || !state) {
            alert("Please fill in all delivery details.");
            return;
        }

        setIsSubmitting(true);
        
        // MOCK PHASE 3 API CALL
        // Normally this would POST to /api/checkout/initialize to get a Paystack URL
        // or directly process the order. Since we're in UI-First mode, we just mock the delay.
        
        setTimeout(() => {
            // Push to the new Orders Dashboard (which we will build next)
            // Passing a mock success flag in query params for the celebration confetti
            router.push('/orders?success=true');
        }, 1500);
    };

    return (
        <form onSubmit={handlePayClick} className={styles.formGroup} style={{ gap: '24px' }}>
            {/* Delivery Details */}
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
                    </svg>
                    Delivery Details
                </h2>
                
                <div className={styles.formGroup}>
                    <input 
                        className={styles.inputField} 
                        placeholder="Full Name" 
                        value={name} 
                        onChange={(e) => setName(e.target.value)} 
                        required 
                    />
                    <input 
                        className={styles.inputField} 
                        placeholder="Phone Number" 
                        type="tel" 
                        value={phone} 
                        onChange={(e) => setPhone(e.target.value)} 
                        required 
                    />
                    <input 
                        className={styles.inputField} 
                        placeholder="Street Address" 
                        value={address} 
                        onChange={(e) => setAddress(e.target.value)} 
                        required 
                    />
                    <div className={styles.inputRow}>
                        <input 
                            className={styles.inputField} 
                            placeholder="City" 
                            value={city} 
                            onChange={(e) => setCity(e.target.value)} 
                            required 
                        />
                        <input 
                            className={styles.inputField} 
                            placeholder="State" 
                            value={state} 
                            onChange={(e) => setState(e.target.value)} 
                            required 
                        />
                    </div>
                </div>
            </section>

            {/* Order Summary & Trust Banner */}
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
                    <span style={{ color: 'var(--primary)' }}>₦{total.toLocaleString()}</span>
                </div>
            </section>

            {/* Sticky Pay Footer */}
            <div className={styles.footer}>
                <button type="submit" className={styles.payBtn} disabled={isSubmitting}>
                    {isSubmitting ? (
                        <>
                            <svg className="spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                            </svg>
                            Locking Funds...
                        </>
                    ) : (
                        <>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>
                            </svg>
                            Pay ₦{total.toLocaleString()} via Escrow
                        </>
                    )}
                </button>
            </div>
        </form>
    );
}
