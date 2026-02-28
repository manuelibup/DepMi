'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

export default function InvitePage({ params }: { params: { id: string } }) {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [bvn, setBvn] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [inviteState, setInviteState] = useState<'VALID' | 'EXPIRED' | 'NOT_FOUND' | 'ACCEPTED' | null>(null);

    // 1. Validate the invite token on load
    useEffect(() => {
        async function validateInvite() {
            try {
                const res = await fetch(`/api/invite/validate?token=${params.id}`);
                const data = await res.json();

                if (res.ok) {
                    setInviteState(data.status); // VALID, EXPIRED, ACCEPTED
                } else {
                    setInviteState('NOT_FOUND');
                    setError(data.message || 'Invalid invite link');
                }
            } catch {
                setInviteState('NOT_FOUND');
                setError('Failed to validate invite link');
            } finally {
                setLoading(false);
            }
        }

        validateInvite();
    }, [params.id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!session?.user) {
            setError("You must be logged in to accept an invite.");
            return;
        }

        if (bvn.length !== 11) {
            setError("BVN must be exactly 11 digits.");
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            // This endpoint will take the BVN, call Dojah/SmileID, and elevate the kycTier if successful.
            const res = await fetch('/api/invite/accept', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token: params.id,
                    bvn
                })
            });

            const data = await res.json();

            if (res.ok) {
                setInviteState('ACCEPTED');
                // Auto-redirect to store creation after short delay
                setTimeout(() => {
                    router.push('/store/create');
                }, 2000);
            } else {
                setError(data.message || "BVN Verification Failed.");
            }
        } catch {
            setError("An unexpected network error occurred.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <div className="spinner"></div> {/* Use your global CSS spinner if you have one */}
                <p style={{ marginLeft: '1rem', color: 'var(--text-secondary)' }}>Verifying secure link...</p>
            </div>
        );
    }

    if (inviteState === 'NOT_FOUND' || inviteState === 'EXPIRED') {
        return (
            <main style={{ maxWidth: '400px', margin: '6rem auto', textAlign: 'center', padding: '0 1.5rem' }}>
                <div style={{ padding: '2rem', background: 'rgba(255, 60, 60, 0.05)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--danger)' }}>
                    <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--danger)', fontWeight: 700 }}>
                        {inviteState === 'EXPIRED' ? 'Invite Expired' : 'Invalid Invite'}
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                        This exclusive vendor invitation link is either invalid or has expired (links expire after 48 hours).
                        Please request a new link from DepMi Support.
                    </p>
                    <Link href="/" style={{ padding: '0.875rem 2rem', background: 'var(--surface-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-full)', color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 600 }}>
                        Return Home
                    </Link>
                </div>
            </main>
        );
    }

    if (inviteState === 'ACCEPTED') {
        return (
            <main style={{ maxWidth: '400px', margin: '6rem auto', textAlign: 'center', padding: '0 1.5rem' }}>
                <div style={{ padding: '2rem', background: 'var(--card-bg)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--primary)', position: 'relative', overflow: 'hidden' }}>
                    <div style={{
                        width: '60px', height: '60px', background: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: '#000'
                    }}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </div>
                    <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                        Identity Verified!
                    </h1>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        You are now a verified DepMi Vendor. Redirecting you to set up your store...
                    </p>
                </div>
            </main>
        );
    }

    // Default: VALID invite state
    return (
        <main style={{ maxWidth: '440px', margin: '4rem auto', padding: '0 1.5rem', fontFamily: 'var(--font-heading)' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <div style={{ display: 'inline-block', padding: '0.5rem 1rem', background: 'rgba(255, 214, 0, 0.15)', color: 'var(--accent)', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '1rem' }}>
                    Exclusive Invitation
                </div>
                <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', fontWeight: 700 }}>Become a DepMi Vendor</h1>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    You&apos;ve been invited to sell on DepMi. To unlock your store, we just need to verify your identity via BVN.
                </p>
            </div>

            {status === 'unauthenticated' ? (
                <div style={{ padding: '2rem', background: 'var(--card-bg)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', textAlign: 'center' }}>
                    <h3 style={{ marginBottom: '1rem', fontWeight: 600 }}>Step 1: Sign in</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                        Please create a personal account or sign in before accepting this invite.
                    </p>
                    <Link href={`/register?callbackUrl=/invite/${params.id}`} style={{ display: 'block', padding: '0.875rem', background: 'var(--primary)', color: '#000', fontWeight: 700, borderRadius: 'var(--radius-full)', textDecoration: 'none', marginBottom: '1rem' }}>
                        Create Account
                    </Link>
                    <Link href={`/login?callbackUrl=/invite/${params.id}`} style={{ display: 'block', padding: '0.875rem', background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontWeight: 600, borderRadius: 'var(--radius-full)', textDecoration: 'none' }}>
                        I already have an account
                    </Link>
                </div>
            ) : (
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', background: 'var(--card-bg)', padding: '2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
                    <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem', marginBottom: '0.5rem' }}>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Signed in as:</p>
                        <p style={{ fontWeight: 600 }}>{session?.user?.email}</p>
                    </div>

                    {error && (
                        <div style={{ padding: '1rem', background: 'rgba(255, 60, 60, 0.1)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', border: '1px solid var(--danger)' }}>
                            {error}
                        </div>
                    )}

                    <div>
                        <label htmlFor="bvn" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Bank Verification Number (BVN)</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                id="bvn"
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={11}
                                value={bvn}
                                onChange={(e) => setBvn(e.target.value.replace(/\D/g, ''))} // strictly numbers
                                placeholder="11-digit BVN"
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
                                    fontSize: '1rem',
                                    letterSpacing: '1px'
                                }}
                            />
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                            </svg>
                            Your BVN is sent securely to Dojah for 1-time verification. DepMi does NOT store your raw BVN.
                        </p>
                    </div>

                    <button
                        type="submit"
                        disabled={submitting || bvn.length !== 11}
                        style={{
                            padding: '1rem',
                            background: 'var(--primary)',
                            color: '#000',
                            fontWeight: 700,
                            border: 'none',
                            borderRadius: 'var(--radius-full)',
                            cursor: (submitting || bvn.length !== 11) ? 'not-allowed' : 'pointer',
                            opacity: (submitting || bvn.length !== 11) ? 0.5 : 1,
                            transition: 'opacity 0.2s, transform 0.1s',
                            marginTop: '0.5rem',
                            fontSize: '1rem'
                        }}
                    >
                        {submitting ? 'Verifying Identity...' : 'Accept Invite & Verify BVN'}
                    </button>
                </form>
            )}
        </main>
    );
}
