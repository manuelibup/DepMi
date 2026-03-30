'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import InputField from '../../../components/Auth/InputField';

export default function VerifyPhonePage() {
    const { status, update } = useSession();
    const router = useRouter();

    const [step, setStep] = useState<1 | 2>(1);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [code, setCode] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    if (status === 'loading') {
        return <div style={{ padding: '4rem', textAlign: 'center' }}>Loading...</div>;
    }

    if (status === 'unauthenticated') {
        router.push('/login?callbackUrl=/verify');
        return null;
    }

    const handleSendOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);

        // Basic E.164 validation (-ish) for Nigeria + international format
        let formattedNumber = phoneNumber.trim();
        if (formattedNumber.startsWith('0')) {
            formattedNumber = '+234' + formattedNumber.slice(1);
        } else if (!formattedNumber.startsWith('+')) {
            formattedNumber = '+' + formattedNumber;
        }

        if (formattedNumber.length < 11 || formattedNumber.length > 15) {
            setError("Please enter a valid phone number.");
            return;
        }

        setLoading(true);
        setPhoneNumber(formattedNumber);

        try {
            const res = await fetch('/api/auth/send-phone-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phoneNumber: formattedNumber })
            });

            const data = await res.json();

            if (res.ok) {
                setSuccessMessage(data.message);
                setStep(2); // Move to verification step
            } else {
                setError(data.message || "Failed to send OTP.");
            }
        } catch (err: unknown) {
            setError("Network error. Please try again.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (code.length !== 6) {
            setError("Code must be 6 digits.");
            return;
        }

        setLoading(true);

        try {
            const res = await fetch('/api/auth/verify-phone-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phoneNumber, code })
            });

            const data = await res.json();

            if (res.ok) {
                setSuccessMessage("Phone verified successfully!");
                // Force NextAuth to reload the session to get updated KycTier if applicable
                await update();

                setTimeout(() => {
                    // Redirect to home or wherever they came from
                    router.push('/');
                }, 1500);
            } else {
                setError(data.message || "Verification failed.");
            }
        } catch (err: unknown) {
            setError("Network error. Please try again.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main style={{ maxWidth: '440px', margin: '4rem auto', padding: '0 1.5rem', fontFamily: 'var(--font-heading)' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', fontWeight: 700 }}>
                    {step === 1 ? 'Verify Phone Number' : 'Enter Passcode'}
                </h1>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {step === 1
                        ? 'Link your phone number to unlock buying and bidding on DepMi.'
                        : `We just sent a 6-digit code to ${phoneNumber}.`
                    }
                </p>
            </div>

            <div style={{ background: 'var(--card-bg)', padding: '2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
                {error && (
                    <div style={{ padding: '1rem', background: 'rgba(255, 60, 60, 0.1)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', border: '1px solid var(--danger)', marginBottom: '1.5rem' }}>
                        {error}
                    </div>
                )}

                {successMessage && step === 2 && (
                    <div style={{ padding: '1rem', background: 'rgba(var(--primary-rgb), 0.1)', color: 'var(--primary)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', border: '1px solid var(--primary)', marginBottom: '1.5rem' }}>
                        {successMessage}
                    </div>
                )}

                {step === 1 ? (
                    <form onSubmit={handleSendOTP} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <InputField
                            label="Phone Number"
                            name="phoneNumber"
                            type="tel"
                            placeholder="e.g. 08012345678 or +234..."
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            required
                        />
                        <button
                            type="submit"
                            disabled={loading || !phoneNumber}
                            style={{
                                padding: '1rem',
                                background: 'var(--primary)',
                                color: '#000',
                                fontWeight: 700,
                                border: 'none',
                                borderRadius: 'var(--radius-md)',
                                cursor: (loading || !phoneNumber) ? 'not-allowed' : 'pointer',
                                opacity: (loading || !phoneNumber) ? 0.5 : 1,
                                fontSize: '1rem',
                                marginTop: '0.5rem'
                            }}
                        >
                            {loading ? 'Sending Code...' : 'Send via SMS'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleVerifyOTP} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div>
                            <label htmlFor="code" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>6-Digit Code</label>
                            <input
                                id="code"
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={6}
                                value={code}
                                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} // strictly numbers
                                placeholder="• • • • • •"
                                required
                                style={{
                                    width: '100%',
                                    padding: '0.875rem 1rem',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border)',
                                    background: 'var(--input-bg)',
                                    color: 'var(--text-primary)',
                                    outline: 'none',
                                    fontFamily: 'monospace',
                                    fontSize: '1.5rem',
                                    letterSpacing: '8px',
                                    textAlign: 'center'
                                }}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading || code.length !== 6}
                            style={{
                                padding: '1rem',
                                background: 'var(--primary)',
                                color: '#000',
                                fontWeight: 700,
                                border: 'none',
                                borderRadius: 'var(--radius-md)',
                                cursor: (loading || code.length !== 6) ? 'not-allowed' : 'pointer',
                                opacity: (loading || code.length !== 6) ? 0.5 : 1,
                                fontSize: '1rem',
                                marginTop: '0.5rem'
                            }}
                        >
                            {loading ? 'Verifying...' : 'Verify Phone'}
                        </button>

                        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                            <button
                                type="button"
                                onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.preventDefault(); setStep(1); }}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-secondary)',
                                    fontSize: '0.875rem',
                                    cursor: 'pointer',
                                    textDecoration: 'underline'
                                }}
                            >
                                Wrong number? Go back
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </main>
    );
}
