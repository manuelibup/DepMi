'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import styles from './secure.module.css';

interface Props {
    needsSetup: boolean;
    hasTotp: boolean;
    hasPin: boolean;
}

export default function SecureAdminClient({ needsSetup, hasTotp, hasPin }: Props) {
    const { update } = useSession();

    // Setup states
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [secret, setSecret] = useState('');
    const [setupStep, setSetupStep] = useState(!hasTotp ? 1 : !hasPin ? 3 : 0);

    // Input states
    const [code, setCode] = useState('');
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (needsSetup && !hasTotp) {
            fetch('/api/auth/2fa/generate', { method: 'POST' })
                .then(r => r.json())
                .then(d => {
                    setQrCodeUrl(d.qrCodeUrl);
                    setSecret(d.secret);
                });
        }
    }, [needsSetup, hasTotp]);

    const handleEnable2FA = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/auth/2fa/enable', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Invalid code');

            setCode('');

            // If they already have a PIN from some previous partial setup, reload to dashboard.
            if (hasPin) {
                window.location.href = '/admin/dashboard';
            } else {
                setSetupStep(3); // Move to PIN setup
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSetupPin = async () => {
        if (pin.length < 4) return setError('PIN must be at least 4 chars');
        if (pin !== confirmPin) return setError('PINs do not match');

        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/admin/pin/setup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to set PIN');

            // Setup complete, trigger full reload
            window.location.href = '/admin/dashboard';
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async () => {
        if (!code || !pin) return setError('Both fields are required');

        setLoading(true);
        setError('');
        try {
            // Send the code and pin to NextAuth session update endpoint
            const newSession = await update({ twoFaCode: code, adminPin: pin });

            // @ts-ignore
            if (newSession?.user?.twoFaVerified && newSession?.user?.adminPinVerified) {
                window.location.href = '/admin/dashboard';
            } else {
                setError('Invalid 2FA code or Admin PIN');
                setLoading(false);
            }
        } catch (err) {
            setError('Verification failed');
            setLoading(false);
        }
    };

    if (needsSetup) {
        return (
            <div className={styles.container}>
                <div className={styles.card}>
                    <h1>Admin Security Setup</h1>
                    <p>You must configure 3-Factor Authentication to access the admin portal.</p>

                    {error && <div className={styles.error}>{error}</div>}

                    {setupStep === 1 && (
                        <div className={styles.step}>
                            <h3>Step 1: Google Authenticator</h3>
                            <p>Scan this QR code with your Google Authenticator or Authy app.</p>
                            {qrCodeUrl ? (
                                <div className={styles.qrContainer}>
                                    <Image src={qrCodeUrl} alt="QR Code" width={200} height={200} />
                                </div>
                            ) : (
                                <p>Loading QR code...</p>
                            )}
                            <p className={styles.secretKey}>{secret}</p>
                            <button className={styles.btn} onClick={() => setSetupStep(2)}>Next</button>
                        </div>
                    )}

                    {setupStep === 2 && (
                        <div className={styles.step}>
                            <h3>Step 2: Verify 2FA</h3>
                            <p>Enter the 6-digit code from your authenticator app to enable it.</p>
                            <div className={styles.inputGroup}>
                                <input
                                    className={styles.input}
                                    value={code}
                                    onChange={e => setCode(e.target.value)}
                                    placeholder="000000"
                                    maxLength={6}
                                />
                            </div>
                            <button className={styles.btn} disabled={loading} onClick={handleEnable2FA}>
                                {loading ? 'Verifying...' : 'Enable 2FA'}
                            </button>
                        </div>
                    )}

                    {setupStep === 3 && (
                        <div className={styles.step}>
                            <h3>Step 3: Setup Admin PIN</h3>
                            <p>Create a static passcode. You will need this + your Google Auth code to login.</p>
                            <div className={styles.inputGroup}>
                                <input
                                    className={styles.input}
                                    type="password"
                                    value={pin}
                                    onChange={e => setPin(e.target.value)}
                                    placeholder="Enter new PIN"
                                />
                                <input
                                    className={styles.input}
                                    type="password"
                                    value={confirmPin}
                                    onChange={e => setConfirmPin(e.target.value)}
                                    placeholder="Confirm new PIN"
                                />
                            </div>
                            <button className={styles.btn} disabled={loading} onClick={handleSetupPin}>
                                {loading ? 'Saving...' : 'Complete Setup'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <h1>Admin Portal Locked</h1>
                <p>Please prove your identity to continue.</p>

                {error && <div className={styles.error}>{error}</div>}

                <div className={styles.inputGroup}>
                    <p style={{ textAlign: 'left', marginBottom: '4px', fontSize: '0.9rem', color: '#374151', fontWeight: 600 }}>Google Authenticator (2FA)</p>
                    <input
                        className={styles.input}
                        value={code}
                        onChange={e => setCode(e.target.value)}
                        placeholder="6-digit code"
                        maxLength={6}
                    />
                </div>

                <div className={styles.inputGroup}>
                    <p style={{ textAlign: 'left', marginBottom: '4px', fontSize: '0.9rem', color: '#374151', fontWeight: 600 }}>Admin Passcode (3FA)</p>
                    <input
                        className={styles.input}
                        type="password"
                        value={pin}
                        onChange={e => setPin(e.target.value)}
                        placeholder="Your PIN"
                    />
                </div>

                <button className={styles.btn} disabled={loading} onClick={handleVerify}>
                    {loading ? 'Verifying...' : 'Unlock Dashboard'}
                </button>
            </div>
        </div>
    );
}
