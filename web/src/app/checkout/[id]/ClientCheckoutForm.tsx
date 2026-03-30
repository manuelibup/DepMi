'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import styles from './page.module.css';
import { useTrackEvent } from '@/hooks/useTrackEvent';

interface CourierOption {
    courierId: string;
    courierName: string;
    courierImage: string;
    serviceCode: string;
    fee: number;
    rawFee: number;
    eta: string | null;
    trackingLabel: string;
    isOnDemand: boolean;
    compositeToken: string;
}

const NIGERIAN_STATES = [
    'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue',
    'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu',
    'FCT (Abuja)', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina',
    'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo',
    'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
];

interface Props {
    productId: string;
    storeId: string;
    productTitle: string;
    productPrice: number;
    subtotal: number;
    stock: number;
    /** Product-level override — null means use store defaults */
    productDeliveryFee: number | null;
    localDeliveryFee: number;
    nationwideDeliveryFee: number;
    storeState: string;
    dispatchEnabled: boolean;
    isDigital?: boolean;
    defaultPhone: string;
    defaultAddress: string;
    defaultCity: string;
    defaultState: string;
}

type Stage = 'form' | 'submitting' | 'redirecting';
type QuoteState = 'idle' | 'loading' | 'done' | 'error';

function isLocalDelivery(buyerState: string, storeState: string): boolean {
    if (!buyerState || !storeState) return false;
    const a = buyerState.toLowerCase().trim();
    const b = storeState.toLowerCase().trim();
    return a.includes(b) || b.includes(a);
}

export default function ClientCheckoutForm({
    productId,
    storeId,
    productTitle,
    productPrice,
    subtotal: itemPrice,
    stock,
    productDeliveryFee,
    localDeliveryFee,
    nationwideDeliveryFee,
    storeState,
    dispatchEnabled,
    isDigital = false,
    defaultPhone, defaultAddress, defaultCity, defaultState,
}: Props) {
    const searchParams = useSearchParams();
    const resumeOrderId = searchParams.get('resume');
    const track = useTrackEvent();

    const [stage, setStage] = useState<Stage>('form');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState(defaultPhone);
    const [address, setAddress] = useState(defaultAddress);
    const [city, setCity] = useState(defaultCity);
    const [stateVal, setStateVal] = useState(defaultState);
    const [deliveryNote, setDeliveryNote] = useState('');
    const [saveDetails, setSaveDetails] = useState(true);
    const [quantity, setQuantity] = useState(1);
    const [deliveryMethod, setDeliveryMethod] = useState<'DELIVERY' | 'PICKUP' | 'DISPATCH'>('DELIVERY');
    const [error, setError] = useState('');

    // State searchable dropdown
    const [showStateList, setShowStateList] = useState(false);
    const stateRef = useRef<HTMLDivElement>(null);

    // Nominatim address autocomplete
    interface NominatimResult { display_name: string; address: Record<string, string> }
    const [addressSuggestions, setAddressSuggestions] = useState<NominatimResult[]>([]);
    const [showAddressList, setShowAddressList] = useState(false);
    const addressRef = useRef<HTMLDivElement>(null);
    const addressDebounceRef = useRef<NodeJS.Timeout | null>(null);
    const addressSelectedRef = useRef(false);

    // GPS location
    const [gpsLoading, setGpsLoading] = useState(false);

    // Live dispatch quote state
    const [quoteState, setQuoteState] = useState<QuoteState>('idle');
    const [couriers, setCouriers] = useState<CourierOption[]>([]);
    const [selectedCourier, setSelectedCourier] = useState<CourierOption | null>(null);
    const [quoteHint, setQuoteHint] = useState<string | null>(null);
    const quoteDebounceRef = useRef<NodeJS.Timeout | null>(null);

    // Derived from selected courier
    const liveDeliveryFee = selectedCourier?.fee ?? null;
    const liveEta = selectedCourier?.eta ?? null;
    const shipbubbleReqToken = selectedCourier?.compositeToken ?? null;

    // Track checkout funnel open
    useEffect(() => {
        track('ORDER', { targetId: productId, targetType: 'product', metadata: { step: 'checkout_open' } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Close dropdowns on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (stateRef.current && !stateRef.current.contains(e.target as Node)) {
                setShowStateList(false);
            }
            if (addressRef.current && !addressRef.current.contains(e.target as Node)) {
                setShowAddressList(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Nominatim address autocomplete — fetch suggestions as user types
    useEffect(() => {
        if (addressSelectedRef.current) { addressSelectedRef.current = false; return; }
        if (address.length < 3) { setAddressSuggestions([]); return; }
        if (addressDebounceRef.current) clearTimeout(addressDebounceRef.current);
        addressDebounceRef.current = setTimeout(async () => {
            try {
                const params = new URLSearchParams({
                    q: address + ', Nigeria',
                    countrycodes: 'ng',
                    format: 'json',
                    addressdetails: '1',
                    limit: '5',
                });
                const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
                    headers: { 'Accept-Language': 'en' },
                });
                const data = await res.json();
                setAddressSuggestions(data);
                if (data.length > 0) setShowAddressList(true);
            } catch { /* silently ignore — user can still type manually */ }
        }, 600);
        return () => { if (addressDebounceRef.current) clearTimeout(addressDebounceRef.current); };
    }, [address]);

    function handleAddressSelect(result: NominatimResult) {
        const a = result.address;
        const street = (a.house_number && a.road)
            ? `${a.house_number} ${a.road}`
            : result.display_name.split(',')[0];
        const cityVal = a.city || a.town || a.village || a.suburb || a.county || '';
        const stateRaw = (a.state || '').replace(/\s*state$/i, '').trim();
        const stateMatch = NIGERIAN_STATES.find(s =>
            s.toLowerCase() === stateRaw.toLowerCase() ||
            s.toLowerCase().includes(stateRaw.toLowerCase()) ||
            stateRaw.toLowerCase().includes(s.toLowerCase())
        );
        addressSelectedRef.current = true;
        setAddress(street);
        if (cityVal) setCity(cityVal);
        if (stateMatch) setStateVal(stateMatch);
        setAddressSuggestions([]);
        setShowAddressList(false);
    }

    async function handleUseMyLocation() {
        if (!navigator.geolocation) return;
        setGpsLoading(true);
        navigator.geolocation.getCurrentPosition(async (pos) => {
            try {
                const { latitude, longitude } = pos.coords;
                const res = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
                    { headers: { 'Accept-Language': 'en' } }
                );
                const data = await res.json();
                if (data?.address) {
                    const a = data.address;
                    const street = (a.house_number && a.road)
                        ? `${a.house_number} ${a.road}`
                        : (a.road || data.display_name.split(',')[0]);
                    const cityVal = a.city || a.town || a.village || a.suburb || a.county || '';
                    const stateRaw = (a.state || '').replace(/\s*state$/i, '').trim();
                    const stateMatch = NIGERIAN_STATES.find(s =>
                        s.toLowerCase() === stateRaw.toLowerCase() ||
                        s.toLowerCase().includes(stateRaw.toLowerCase()) ||
                        stateRaw.toLowerCase().includes(s.toLowerCase())
                    );
                    addressSelectedRef.current = true;
                    if (street) setAddress(street);
                    if (cityVal) setCity(cityVal);
                    if (stateMatch) setStateVal(stateMatch);
                }
            } catch { /* silently ignore */ }
            setGpsLoading(false);
        }, () => setGpsLoading(false), { timeout: 8000 });
    }

    // Fetch live quote when user picks DepMi Dispatch tab and address is complete
    useEffect(() => {
        if (deliveryMethod !== 'DISPATCH') return;
        if (!address.trim() || !city.trim() || !stateVal.trim()) return;

        if (quoteDebounceRef.current) clearTimeout(quoteDebounceRef.current);
        quoteDebounceRef.current = setTimeout(async () => {
            setQuoteState('loading');
            setCouriers([]);
            setSelectedCourier(null);
            setQuoteHint(null);
            try {
                const res = await fetch('/api/delivery/quote', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        storeId,
                        deliveryAddress: address.trim(),
                        deliveryCity: city.trim(),
                        deliveryState: stateVal.trim(),
                        productTitle,
                        productPrice,
                        quantity,
                    }),
                });
                const data = await res.json();
                if (!res.ok || !data.dispatchEnabled) {
                    setQuoteHint(data.userHint ?? null);
                    setQuoteState('error');
                    track('ORDER', { targetId: productId, targetType: 'product', metadata: { step: 'quote_error', hint: data.userHint ?? null } });
                    return;
                }
                const options: CourierOption[] = data.couriers ?? [];
                setCouriers(options);
                setSelectedCourier(data.cheapest ?? options[0] ?? null);
                setQuoteState('done');
            } catch {
                setQuoteState('error');
            }
        }, 800);

        return () => {
            if (quoteDebounceRef.current) clearTimeout(quoteDebounceRef.current);
        };
    }, [address, city, stateVal, quantity, deliveryMethod, dispatchEnabled, storeId, productTitle, productPrice]);

    // Compute active delivery fee
    function getDeliveryFee(): { fee: number; label: string | null; isLive: boolean } {
        if (isDigital) return { fee: 0, label: 'Instant digital delivery', isLive: false };
        if (deliveryMethod === 'PICKUP') return { fee: 0, label: null, isLive: false };
        if (deliveryMethod === 'DISPATCH') {
            if (liveDeliveryFee !== null) {
                return { fee: liveDeliveryFee, label: liveEta ? `DepMi Dispatch · ${liveEta}` : 'DepMi Dispatch', isLive: true };
            }
            return { fee: 0, label: 'Fetching quote…', isLive: false };
        }
        // DELIVERY — seller's own fee
        if (productDeliveryFee !== null) return { fee: productDeliveryFee, label: null, isLive: false };
        if (storeState && stateVal) {
            if (isLocalDelivery(stateVal, storeState)) {
                return { fee: localDeliveryFee, label: 'Local delivery', isLive: false };
            }
            return { fee: nationwideDeliveryFee, label: 'Nationwide delivery', isLive: false };
        }
        return { fee: nationwideDeliveryFee, label: nationwideDeliveryFee > 0 ? 'Est. nationwide' : null, isLive: false };
    }

    const { fee: currentDeliveryFee, label: deliveryLabel, isLive } = getDeliveryFee();
    const currentSubtotal = itemPrice * quantity;
    const baseTotal = currentSubtotal + currentDeliveryFee;
    const gatewayFee = Math.round(baseTotal * 0.05 * 100) / 100;
    const finalTotal = baseTotal + gatewayFee;

    const filteredStates = NIGERIAN_STATES.filter(s =>
        s.toLowerCase().includes(stateVal.toLowerCase())
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!isDigital) {
            if ((deliveryMethod === 'DELIVERY' || deliveryMethod === 'DISPATCH') && (!name.trim() || !phone.trim() || !address.trim() || !city.trim() || !stateVal.trim())) {
                setError('Please fill in all delivery details.');
                return;
            }
            if (deliveryMethod === 'DISPATCH' && quoteState !== 'done') {
                setError('Please wait for the delivery quote to load before placing your order.');
                return;
            }
            if (deliveryMethod === 'PICKUP' && !phone.trim()) {
                setError('Please provide a phone number for the seller to contact you.');
                return;
            }
        }

        setStage('submitting');
        track('ORDER', { targetId: productId, targetType: 'product', metadata: { step: 'checkout_submit' } });

        try {
            const res = await fetch('/api/checkout/initialize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId,
                    quantity,
                    isDigital,
                    deliveryMethod: isDigital ? 'DIGITAL' : (deliveryMethod === 'DISPATCH' ? 'DELIVERY' : deliveryMethod),
                    deliveryAddress: isDigital ? 'DIGITAL' : (deliveryMethod === 'PICKUP' ? 'PICKUP' : `${address}, ${city}, ${stateVal}`),
                    deliveryNote: deliveryNote.trim() || undefined,
                    phone: phone.trim(),
                    addressLine: address.trim(),
                    city: city.trim(),
                    stateVal: stateVal.trim(),
                    saveDetails,
                    resumeOrderId,
                    shipbubbleReqToken: shipbubbleReqToken ?? undefined,
                    shipbubbleDeliveryFee: liveDeliveryFee ?? undefined,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                const reason = data.error ?? 'Something went wrong. Please try again.';
                setError(reason);
                setStage('form');
                track('ORDER', { targetId: productId, targetType: 'product', metadata: { step: 'checkout_error', reason } });
                return;
            }

            setStage('redirecting');
            track('ORDER', { targetId: productId, targetType: 'product', metadata: { step: 'checkout_redirect', orderId: data.orderId } });
            window.location.href = data.paymentLink;
        } catch {
            setError('Network error. Please check your connection and try again.');
            setStage('form');
            track('ORDER', { targetId: productId, targetType: 'product', metadata: { step: 'checkout_error', reason: 'network_error' } });
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
                <p>You&apos;ll be taken to Flutterwave to complete your payment safely.</p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className={styles.formGroup} style={{ gap: '24px' }}>
            {isDigital && (
                <section className={styles.section}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(var(--primary-rgb),0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                        </div>
                        <div>
                            <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>Digital Product</p>
                            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>Your download link will appear in your orders immediately after payment.</p>
                        </div>
                    </div>
                </section>
            )}
            {!isDigital && (
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
                    <button
                        type="button"
                        className={`${styles.methodBtn} ${deliveryMethod === 'DISPATCH' ? styles.methodBtnActive : ''} ${!dispatchEnabled ? styles.methodBtnDisabled : ''}`}
                        onClick={() => dispatchEnabled && setDeliveryMethod('DISPATCH')}
                        title={!dispatchEnabled ? 'Seller hasn\'t enabled DepMi Dispatch yet' : undefined}
                    >
                        DepMi Dispatch
                    </button>
                </div>
                {deliveryMethod === 'DISPATCH' && !dispatchEnabled && (
                    <p style={{ fontSize: '0.82rem', color: '#f59e0b', margin: '4px 0 0' }}>
                        This seller hasn&apos;t enabled DepMi Dispatch yet. Choose Delivery or Pickup.
                    </p>
                )}

                <div className={styles.formGroup}>
                    <div className={styles.qtyContainer}>
                        <span className={styles.qtyLabel}>Quantity</span>
                        <div className={styles.qtySelector}>
                            <button type="button" className={styles.qtyBtn} onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1}>-</button>
                            <span className={styles.qtyValue}>{quantity}</span>
                            <button type="button" className={styles.qtyBtn} onClick={() => setQuantity(Math.min(stock, quantity + 1))} disabled={quantity >= stock}>+</button>
                        </div>
                    </div>

                    {(deliveryMethod === 'DELIVERY' || deliveryMethod === 'DISPATCH') ? (
                        <>
                            <input className={styles.inputField} placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} required />
                            <input className={styles.inputField} placeholder="Phone Number" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                            <button
                                type="button"
                                onClick={handleUseMyLocation}
                                disabled={gpsLoading}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    background: 'transparent',
                                    border: '1px solid var(--card-border)',
                                    borderRadius: 8,
                                    color: 'var(--primary)',
                                    fontSize: '0.82rem',
                                    fontWeight: 600,
                                    padding: '6px 12px',
                                    cursor: gpsLoading ? 'not-allowed' : 'pointer',
                                    opacity: gpsLoading ? 0.6 : 1,
                                    alignSelf: 'flex-start',
                                }}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                                </svg>
                                {gpsLoading ? 'Detecting…' : 'Use my location'}
                            </button>
                            <div ref={addressRef} style={{ position: 'relative' }}>
                                <input
                                    className={styles.inputField}
                                    placeholder="Street Address"
                                    value={address}
                                    autoComplete="off"
                                    onChange={(e) => { setAddress(e.target.value); setShowAddressList(true); }}
                                    onFocus={() => { if (addressSuggestions.length > 0) setShowAddressList(true); }}
                                    required
                                />
                                {showAddressList && addressSuggestions.length > 0 && (
                                    <div style={{
                                        position: 'absolute',
                                        top: 'calc(100% + 4px)',
                                        left: 0,
                                        right: 0,
                                        background: 'var(--card-bg)',
                                        border: '1px solid var(--card-border)',
                                        borderRadius: '12px',
                                        maxHeight: '220px',
                                        overflowY: 'auto',
                                        zIndex: 50,
                                        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                                    }}>
                                        {addressSuggestions.map((r, i) => (
                                            <button
                                                key={i}
                                                type="button"
                                                onMouseDown={(e) => { e.preventDefault(); handleAddressSelect(r); }}
                                                style={{
                                                    display: 'block',
                                                    width: '100%',
                                                    textAlign: 'left',
                                                    padding: '10px 14px',
                                                    background: 'transparent',
                                                    border: 'none',
                                                    color: 'var(--text-main)',
                                                    fontSize: '0.85rem',
                                                    cursor: 'pointer',
                                                    lineHeight: 1.4,
                                                    borderBottom: i < addressSuggestions.length - 1 ? '1px solid var(--card-border)' : 'none',
                                                }}
                                            >
                                                {r.display_name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className={styles.inputRow}>
                                <input className={styles.inputField} placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} required />

                                {/* Searchable state dropdown */}
                                <div ref={stateRef} style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                                    <input
                                        className={styles.inputField}
                                        placeholder="State"
                                        value={stateVal}
                                        autoComplete="off"
                                        onChange={(e) => {
                                            setStateVal(e.target.value);
                                            setShowStateList(true);
                                        }}
                                        onFocus={() => setShowStateList(true)}
                                        required
                                        style={{ paddingRight: '32px' }}
                                    />
                                    <svg
                                        style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}
                                        width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                    >
                                        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                                    </svg>
                                    {showStateList && stateVal.length > 0 && filteredStates.length > 0 && (
                                        <div style={{
                                            position: 'absolute',
                                            top: 'calc(100% + 4px)',
                                            left: 0,
                                            right: 0,
                                            background: 'var(--card-bg)',
                                            border: '1px solid var(--card-border)',
                                            borderRadius: '12px',
                                            maxHeight: '200px',
                                            overflowY: 'auto',
                                            zIndex: 50,
                                            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                                        }}>
                                            {filteredStates.map(state => (
                                                <button
                                                    key={state}
                                                    type="button"
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        setStateVal(state);
                                                        setShowStateList(false);
                                                    }}
                                                    style={{
                                                        display: 'block',
                                                        width: '100%',
                                                        textAlign: 'left',
                                                        padding: '10px 14px',
                                                        background: stateVal === state ? 'rgba(var(--primary-rgb),0.08)' : 'transparent',
                                                        border: 'none',
                                                        color: stateVal === state ? 'var(--primary)' : 'var(--text-main)',
                                                        fontWeight: stateVal === state ? 600 : 400,
                                                        fontSize: '0.875rem',
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    {state}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        {/* Courier picker — shown when DepMi Dispatch is selected and quote loads */}
                        {deliveryMethod === 'DISPATCH' && quoteState === 'loading' && (
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>Fetching live courier rates…</p>
                        )}
                        {deliveryMethod === 'DISPATCH' && quoteState === 'error' && (
                            <p style={{ fontSize: '0.85rem', color: '#f59e0b', marginTop: '4px' }}>{quoteHint ?? 'Could not fetch dispatch rates. Try a different delivery option.'}</p>
                        )}
                        {deliveryMethod === 'DISPATCH' && quoteState === 'done' && couriers.length > 0 && (
                            <div style={{ marginTop: '8px' }}>
                                <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Choose courier
                                </p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {couriers.map((c) => {
                                        const selected = selectedCourier?.serviceCode === c.serviceCode;
                                        return (
                                            <button
                                                key={c.serviceCode}
                                                type="button"
                                                onClick={() => setSelectedCourier(c)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '12px',
                                                    padding: '12px 14px',
                                                    borderRadius: '12px',
                                                    border: selected ? '2px solid var(--primary)' : '1.5px solid var(--card-border)',
                                                    background: selected ? 'rgba(var(--primary-rgb),0.06)' : 'var(--card-bg)',
                                                    cursor: 'pointer',
                                                    textAlign: 'left',
                                                    width: '100%',
                                                    transition: 'border-color 0.15s',
                                                }}
                                            >
                                                {c.courierImage ? (
                                                    <img src={c.courierImage} alt={c.courierName} style={{ width: 36, height: 36, borderRadius: '8px', objectFit: 'contain', flexShrink: 0, background: '#fff' }} />
                                                ) : (
                                                    <div style={{ width: 36, height: 36, borderRadius: '8px', background: 'var(--card-border)', flexShrink: 0 }} />
                                                )}
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>{c.courierName}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                        {c.eta ?? 'ETA unavailable'}
                                                        {c.trackingLabel && ` · ${c.trackingLabel} tracking`}
                                                        {c.isOnDemand && ' · On-demand'}
                                                    </div>
                                                </div>
                                                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: selected ? 'var(--primary)' : 'var(--text-main)', flexShrink: 0 }}>
                                                    ₦{c.fee.toLocaleString()}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        </>
                    ) : (
                        <div className={styles.pickupNotice}>
                            <p>You&apos;ll need to contact the seller to arrange a pickup location after payment.</p>
                        </div>
                    )}

                    <input className={styles.inputField} placeholder="Delivery note (optional)" value={deliveryNote} onChange={(e) => setDeliveryNote(e.target.value)} />

                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        <input type="checkbox" checked={saveDetails} onChange={(e) => setSaveDetails(e.target.checked)} style={{ accentColor: 'var(--primary)', width: '16px', height: '16px' }} />
                        Save these delivery details for future orders
                    </label>
                </div>
            </section>
            )}

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="16" height="20" x="4" y="2" rx="2" ry="2" /><path d="M9 18h6" /><path d="M12 14h.01" /><path d="M12 10h.01" /><path d="M12 6h.01" />
                    </svg>
                    Order Summary
                </h2>

                <div className={styles.summaryRow}><span>Items ({quantity})</span><span>₦{currentSubtotal.toLocaleString()}</span></div>
                <div className={styles.summaryRow}>
                    <span>
                        Delivery
                        {deliveryLabel && (
                            <span style={{ fontSize: '0.75rem', color: isLive ? 'var(--primary)' : 'var(--text-muted)', marginLeft: '6px' }}>
                                ({deliveryLabel})
                            </span>
                        )}
                        {deliveryMethod === 'DISPATCH' && quoteState === 'loading' && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '6px' }}>Fetching live quote…</span>
                        )}
                        {deliveryMethod === 'DISPATCH' && quoteState === 'error' && (
                            <span style={{ fontSize: '0.75rem', color: '#f59e0b', marginLeft: '6px' }}>
                                {quoteHint ?? 'Quote unavailable'}
                            </span>
                        )}
                    </span>
                    <span>
                        {isDigital || deliveryMethod === 'PICKUP'
                            ? 'Free'
                            : deliveryMethod === 'DISPATCH' && quoteState !== 'done'
                            ? '—'
                            : `₦${currentDeliveryFee.toLocaleString()}`}
                    </span>
                </div>
                <div className={styles.summaryRow}><span>Service &amp; escrow fee (5%)</span><span>₦{gatewayFee.toLocaleString()}</span></div>

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
