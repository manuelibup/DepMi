'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import CloudinaryUploader from '@/components/CloudinaryUploader';
import styles from './page.module.css';

type CheckState = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

type Step = 0 | 1 | 2 | 3 | 4 | 5 | 'done';

interface SuggestedUser {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    bio: string | null;
    _count: { followers: number };
}

const INTEREST_OPTIONS = [
    { value: 'FOOD', label: 'Food & Drinks', emoji: '🍔' },
    { value: 'FASHION', label: 'Fashion', emoji: '👗' },
    { value: 'GADGETS', label: 'Gadgets', emoji: '📱' },
    { value: 'BEAUTY', label: 'Beauty', emoji: '💄' },
    { value: 'COSMETICS', label: 'Cosmetics', emoji: '🧴' },
    { value: 'SPORT', label: 'Sports', emoji: '⚽' },
    { value: 'HOUSING', label: 'Housing', emoji: '🏠' },
    { value: 'TRANSPORT', label: 'Transport', emoji: '🚗' },
    { value: 'FURNITURE', label: 'Furniture', emoji: '🛋️' },
    { value: 'BOOKS', label: 'Books', emoji: '📚' },
    { value: 'COURSE', label: 'Courses', emoji: '🎓' },
    { value: 'SERVICES', label: 'Services', emoji: '🔧' },
    { value: 'VEHICLES', label: 'Vehicles', emoji: '🏍️' },
];

const MIN_INTERESTS = 3;
const MIN_FOLLOWS = 7;

export default function OnboardingPage() {
    const { data: session, status, update } = useSession();
    const router = useRouter();

    const searchParams = useSearchParams();
    const isRepair = searchParams.get('repair') === '1';

    const [step, setStep] = useState<Step>(isRepair ? 1 : 0);

    // ── Step 1 state ──
    const [username, setUsername] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [step1Loading, setStep1Loading] = useState(false);
    const [step1Error, setStep1Error] = useState('');
    const [checkState, setCheckState] = useState<CheckState>('idle');
    const [checkMsg, setCheckMsg] = useState('');
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Step 2 state ──
    const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
    const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
    const [followLoading, setFollowLoading] = useState<Set<string>>(new Set());
    const [step2Fetched, setStep2Fetched] = useState(false);

    // ── Step 3 (location) state ──
    const [city, setCity] = useState('');
    const [locationState, setLocationState] = useState('');
    const [country, setCountry] = useState('');
    const [step3Loading, setStep3Loading] = useState(false);

    // ── Step 4 (interests) state ──
    const [interests, setInterests] = useState<Set<string>>(new Set());
    const [step4Loading, setStep4Loading] = useState(false);
    const [step4Error, setStep4Error] = useState('');

    // ── Step 5 (referral source) state ──
    const [referralSource, setReferralSource] = useState('');
    const [referralOther, setReferralOther] = useState('');
    const [step5Loading, setStep5Loading] = useState(false);

    const minFollows = Math.min(MIN_FOLLOWS, suggestedUsers.length);

    // ── Redirect guard ──
    useEffect(() => {
        if (session?.user?.name && !displayName) {
            setDisplayName(session.user.name);
        }

        if (isRepair && session?.user?.username && !username) {
            const cleaned = session.user.username.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
            setUsername(cleaned);
            handleUsernameChange(cleaned);
        }

        if (status === 'authenticated' && session.user.onboardingComplete && !isRepair) {
            router.push('/');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session, status, isRepair]);

    // ── Fetch suggested users on entering step 2 ──
    useEffect(() => {
        if (step === 2 && !step2Fetched) {
            setStep2Fetched(true);
            fetch('/api/user/suggested')
                .then(r => r.json())
                .then(d => setSuggestedUsers(d.users ?? []))
                .catch(() => {});
        }
    }, [step, step2Fetched]);

    // ── Username availability check ──
    const handleUsernameChange = useCallback((raw: string) => {
        const cleaned = raw.toLowerCase().replace(/[^a-z0-9_]/g, '');
        setUsername(cleaned);

        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (cleaned.length === 0) { setCheckState('idle'); setCheckMsg(''); return; }
        if (cleaned.length < 3) { setCheckState('invalid'); setCheckMsg('At least 3 characters required'); return; }
        if (cleaned.length > 20) { setCheckState('invalid'); setCheckMsg('Maximum 20 characters'); return; }

        setCheckState('checking');
        setCheckMsg('');

        debounceRef.current = setTimeout(async () => {
            try {
                const res = await fetch(`/api/user/check-username?username=${encodeURIComponent(cleaned)}`);
                const data = await res.json();
                if (data.available) {
                    setCheckState('available');
                    setCheckMsg('@' + cleaned + ' is available');
                } else {
                    setCheckState('taken');
                    setCheckMsg(data.reason ?? 'Username not available');
                }
            } catch {
                setCheckState('idle');
                setCheckMsg('');
            }
        }, 400);
    }, []);

    // ── Step 1 submit ──
    const handleStep1Submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (checkState !== 'available') return;
        setStep1Loading(true);
        setStep1Error('');

        try {
            const body: Record<string, string> = { username, displayName };
            if (avatarUrl) body.avatarUrl = avatarUrl;

            const res = await fetch('/api/user/onboarding', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const data = await res.json();

            if (!res.ok) {
                if (data.message?.toLowerCase().includes('taken')) {
                    setCheckState('taken');
                    setCheckMsg('Username just got taken — try another');
                }
                throw new Error(data.message || 'Failed to save username');
            }

            await update({ username, name: displayName });

            if (isRepair) {
                await fetch('/api/user/complete-onboarding', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ interests: [] }),
                });
                await update({ onboardingComplete: true });
                router.push('/');
                router.refresh();
                return;
            }

            setStep(2);
        } catch (e: unknown) {
            setStep1Error(e instanceof Error ? e.message : 'Something went wrong');
        } finally {
            setStep1Loading(false);
        }
    };

    // ── Step 2: follow / unfollow ──
    const toggleFollow = async (userId: string) => {
        if (followLoading.has(userId)) return;

        setFollowLoading(prev => new Set(prev).add(userId));
        const isFollowing = followedIds.has(userId);

        try {
            await fetch('/api/users/follow', {
                method: isFollowing ? 'DELETE' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetUserId: userId }),
            });

            setFollowedIds(prev => {
                const next = new Set(prev);
                if (isFollowing) next.delete(userId);
                else next.add(userId);
                return next;
            });
        } catch {
            // silent
        } finally {
            setFollowLoading(prev => {
                const next = new Set(prev);
                next.delete(userId);
                return next;
            });
        }
    };

    // ── Step 3 (location) submit ──
    const handleStep3Submit = async () => {
        setStep3Loading(true);
        try {
            await fetch('/api/user/update', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...(city.trim() && { city: city.trim() }),
                    ...(locationState.trim() && { state: locationState.trim() }),
                    ...(country.trim() && { country: country.trim() }),
                }),
            });
        } catch {
            // non-blocking
        } finally {
            setStep3Loading(false);
        }
        setStep(4);
    };

    // ── Step 4: toggle interests ──
    const toggleInterest = (value: string) => {
        setInterests(prev => {
            const next = new Set(prev);
            if (next.has(value)) next.delete(value);
            else next.add(value);
            return next;
        });
    };

    // ── Step 4 submit → advance to step 5 ──
    const handleFinish = async () => {
        if (interests.size < MIN_INTERESTS) return;
        setStep(5);
    };

    // ── Step 5 submit (complete onboarding + save referral source) ──
    const handleStep5Submit = async (source: string) => {
        setStep5Loading(true);
        const finalSource = source === 'Other' ? referralOther.trim() || 'Other' : source;

        try {
            const res = await fetch('/api/user/complete-onboarding', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    interests: Array.from(interests),
                    referralSource: finalSource,
                }),
            });

            if (!res.ok) throw new Error('Failed to complete onboarding');

            await update({ onboardingComplete: true });
            setStep('done');
        } catch {
            // non-blocking — still complete onboarding
            await update({ onboardingComplete: true });
            setStep('done');
        } finally {
            setStep5Loading(false);
        }
    };

    // ── Loading / unauthenticated states ──
    if (status === 'loading') {
        return (
            <div className={styles.main}>
                <div className={styles.container}>
                    <p className={styles.subtitle}>Loading...</p>
                </div>
            </div>
        );
    }

    if (status === 'unauthenticated') {
        router.push('/login');
        return null;
    }

    const inputBorderColor =
        checkState === 'available' ? 'var(--primary)' :
            checkState === 'taken' || checkState === 'invalid' ? '#e74c3c' :
                undefined;

    const checkColor =
        checkState === 'available' ? 'var(--primary)' :
            checkState === 'taken' || checkState === 'invalid' ? '#e74c3c' :
                'var(--text-muted)';

    const canSubmitStep1 = !step1Loading && displayName.trim().length >= 2 && checkState === 'available';
    const canProceedStep2 = followedIds.size >= minFollows || suggestedUsers.length === 0;
    const canFinish = interests.size >= MIN_INTERESTS;

    // ── STEP 0: Welcome screen ──
    if (step === 0) {
        return (
            <main className={styles.main}>
                <div className={styles.bgBlob} />
                <div className={styles.container}>
                    <div className={styles.welcomeLogo}>
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                            <line x1="3" y1="6" x2="21" y2="6" />
                            <path d="M16 10a4 4 0 0 1-8 0" />
                        </svg>
                    </div>
                    <div className={styles.header}>
                        <h1 className={styles.title}>Welcome to DepMi</h1>
                        <p className={styles.subtitle}>Your social commerce marketplace. Buy, sell, and connect with trusted traders across Africa.</p>
                    </div>
                    <div className={styles.valueProps}>
                        <div className={styles.valueProp}>
                            <span className={styles.valuePropIcon}>🛡️</span>
                            <div>
                                <p className={styles.valuePropTitle}>Escrow Protection</p>
                                <p className={styles.valuePropDesc}>Your money is held safely until you confirm delivery</p>
                            </div>
                        </div>
                        <div className={styles.valueProp}>
                            <span className={styles.valuePropIcon}>⭐</span>
                            <div>
                                <p className={styles.valuePropTitle}>Trusted Sellers</p>
                                <p className={styles.valuePropDesc}>Verified stores with real reviews and Dep ratings</p>
                            </div>
                        </div>
                        <div className={styles.valueProp}>
                            <span className={styles.valuePropIcon}>🌍</span>
                            <div>
                                <p className={styles.valuePropTitle}>Made for Africa</p>
                                <p className={styles.valuePropDesc}>Local and nationwide delivery, Naira payments</p>
                            </div>
                        </div>
                    </div>
                    <button
                        type="button"
                        className={styles.submitBtn}
                        onClick={() => setStep(1)}
                    >
                        Get Started
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12h14m-7-7 7 7-7 7" />
                        </svg>
                    </button>
                </div>
            </main>
        );
    }

    // ── DONE screen ──
    if (step === 'done') {
        return (
            <main className={styles.main}>
                <div className={styles.bgBlob} />
                <div className={styles.container}>
                    <div className={styles.doneIcon}>🎉</div>
                    <div className={styles.header}>
                        <h1 className={styles.title}>You&apos;re in!</h1>
                        <p className={styles.subtitle}>Your DepMi account is ready. Here&apos;s what you can do next.</p>
                    </div>

                    {/* Next-step cards */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                        <button
                            type="button"
                            className={styles.submitBtn}
                            onClick={() => { router.push('/'); router.refresh(); }}
                        >
                            Explore the Feed
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M5 12h14m-7-7 7 7-7 7" />
                            </svg>
                        </button>
                        <button
                            type="button"
                            className={styles.ghostBtn}
                            onClick={() => { router.push('/demand/new'); router.refresh(); }}
                        >
                            Post a Request
                        </button>
                        <button
                            type="button"
                            className={styles.ghostBtn}
                            onClick={() => { router.push('/store/create'); router.refresh(); }}
                        >
                            Open a Store &amp; Start Selling
                        </button>
                    </div>

                    {/* Help section */}
                    <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '16px', textAlign: 'center' }}>
                        <p style={{ margin: '0 0 8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            Need help getting started?
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
                            <a
                                href="/blog/how-to-start-an-online-store-in-nigeria"
                                style={{ fontSize: '0.78rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}
                            >
                                How to sell on DepMi
                            </a>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>·</span>
                            <a
                                href="/blog/how-to-buy-safely-online-nigeria"
                                style={{ fontSize: '0.78rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}
                            >
                                How to buy safely
                            </a>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>·</span>
                            <a
                                href="mailto:manuel@depmi.com"
                                style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textDecoration: 'none' }}
                            >
                                Contact support
                            </a>
                        </div>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className={styles.main}>
            <div className={styles.bgBlob} />

            <div className={styles.container} style={step === 2 ? { maxWidth: 520 } : undefined}>

                {/* Step indicator — steps 1–4 only, not repair */}
                {!isRepair && (
                    <div className={styles.stepIndicator}>
                        {([1, 2, 3, 4, 5] as (1|2|3|4|5)[]).map(s => (
                            <div
                                key={s}
                                className={`${styles.stepDot} ${step === s ? styles.stepDotActive : ''} ${(step as number) > s ? styles.stepDotDone : ''}`}
                            />
                        ))}
                    </div>
                )}

                {/* ── STEP 1: Profile ── */}
                {step === 1 && (
                    <>
                        <div className={styles.header}>
                            <h1 className={styles.title}>{isRepair ? 'Update your username' : 'Set up your profile'}</h1>
                            <p className={styles.subtitle}>
                                {isRepair
                                    ? 'Your current username contains spaces, which is no longer supported. Please choose a new handle.'
                                    : 'Add your photo, name, and a unique username.'}
                            </p>
                        </div>

                        {isRepair && (
                            <div style={{
                                background: 'rgba(52, 152, 219, 0.1)',
                                border: '1px solid var(--primary)',
                                borderRadius: '12px',
                                padding: '12px 16px',
                                fontSize: '0.9rem',
                                color: 'var(--text-main)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px'
                            }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, color: 'var(--primary)' }}>
                                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
                                </svg>
                                <span>We&apos;ve suggested a cleaned version for you below.</span>
                            </div>
                        )}

                        {step1Error && (
                            <div className={styles.error}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                                {step1Error}
                            </div>
                        )}

                        {/* Avatar upload */}
                        {!isRepair && (
                            <div className={styles.avatarUploadRow}>
                                <div className={styles.avatarPreview}>
                                    {avatarUrl ? (
                                        <Image src={avatarUrl} alt="Your avatar" fill style={{ objectFit: 'cover' }} sizes="72px" />
                                    ) : (
                                        <span style={{ fontSize: '1.75rem' }}>
                                            {displayName ? displayName.charAt(0).toUpperCase() : '?'}
                                        </span>
                                    )}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <p style={{ margin: '0 0 6px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Profile photo</p>
                                    <CloudinaryUploader
                                        accept="image/*"
                                        maxSizeMB={5}
                                        buttonText={avatarUrl ? 'Change photo' : 'Upload photo'}
                                        cropAspectRatio={1}
                                        cropTitle="Crop your profile photo"
                                        onUploadSuccess={(result) => setAvatarUrl(result.secure_url)}
                                    />
                                    <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Optional · JPG or PNG</p>
                                </div>
                            </div>
                        )}

                        <form className={styles.form} onSubmit={handleStep1Submit}>
                            <div className={styles.fieldGroup}>
                                <label className={styles.label}>Display Name</label>
                                <div className={styles.inputWrapper}>
                                    <svg className={styles.inputIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                                    </svg>
                                    <input
                                        type="text"
                                        className={styles.input}
                                        placeholder="How should people address you?"
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        required
                                        disabled={step1Loading}
                                    />
                                </div>
                            </div>

                            <div className={styles.fieldGroup}>
                                <label className={styles.label}>
                                    Pick a Username
                                    <span className={styles.hint}>Letters, numbers, underscores · 3–20 chars</span>
                                </label>
                                <div className={styles.inputWrapper} style={inputBorderColor ? { outline: `2px solid ${inputBorderColor}`, borderRadius: '12px' } : undefined}>
                                    <span className={styles.usernamePrefix}>@</span>
                                    <input
                                        type="text"
                                        className={`${styles.input} ${styles.inputWithPrefix}`}
                                        placeholder="username"
                                        value={username}
                                        onChange={(e) => handleUsernameChange(e.target.value)}
                                        required
                                        disabled={step1Loading}
                                        maxLength={20}
                                        autoComplete="off"
                                        autoCorrect="off"
                                        autoCapitalize="off"
                                        spellCheck={false}
                                    />
                                    {checkState === 'checking' && (
                                        <span style={{ marginRight: '12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>checking...</span>
                                    )}
                                    {checkState === 'available' && (
                                        <svg style={{ marginRight: '12px', flexShrink: 0, color: 'var(--primary)' }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></svg>
                                    )}
                                    {(checkState === 'taken' || checkState === 'invalid') && (
                                        <svg style={{ marginRight: '12px', flexShrink: 0, color: '#e74c3c' }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" /></svg>
                                    )}
                                </div>
                                {checkMsg && (
                                    <p style={{ margin: '6px 0 0 4px', fontSize: '0.8rem', color: checkColor, fontWeight: 500 }}>
                                        {checkMsg}
                                    </p>
                                )}
                            </div>

                            <button type="submit" className={styles.submitBtn} disabled={!canSubmitStep1}>
                                {step1Loading ? 'Saving...' : isRepair ? 'Update Username' : 'Continue'}
                                {!step1Loading && (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M5 12h14m-7-7 7 7-7 7" />
                                    </svg>
                                )}
                            </button>
                        </form>
                    </>
                )}

                {/* ── STEP 2: Follow accounts ── */}
                {step === 2 && (
                    <>
                        <div className={styles.header}>
                            <h1 className={styles.title}>Follow people you like</h1>
                            <p className={styles.subtitle}>
                                {suggestedUsers.length === 0
                                    ? 'Loading suggestions...'
                                    : `Follow at least ${minFollows} account${minFollows !== 1 ? 's' : ''} to grow the community and curate your feed.`}
                            </p>
                        </div>

                        <p style={{ textAlign: 'center', fontSize: '0.85rem', color: followedIds.size >= minFollows ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 600 }}>
                            {followedIds.size} following
                            {followedIds.size < minFollows
                                ? ` · ${minFollows - followedIds.size} more to go`
                                : ' · Ready to continue!'}
                        </p>

                        <div className={styles.userGrid}>
                            {suggestedUsers.map(user => {
                                const isFollowing = followedIds.has(user.id);
                                const isLoading = followLoading.has(user.id);
                                return (
                                    <div key={user.id} className={styles.userCard}>
                                        <div className={styles.userCardAvatar}>
                                            {user.avatarUrl ? (
                                                <Image src={user.avatarUrl} alt={user.displayName} fill style={{ objectFit: 'cover' }} />
                                            ) : (
                                                <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)' }}>
                                                    {user.displayName.charAt(0).toUpperCase()}
                                                </span>
                                            )}
                                        </div>
                                        <div className={styles.userCardInfo}>
                                            <p className={styles.userCardName}>{user.displayName}</p>
                                            <p className={styles.userCardHandle}>@{user.username}</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => toggleFollow(user.id)}
                                            disabled={isLoading}
                                            className={`${styles.followBtn} ${isFollowing ? styles.followBtnActive : ''}`}
                                        >
                                            {isLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
                                        </button>
                                    </div>
                                );
                            })}

                            {suggestedUsers.length === 0 && (
                                <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', padding: '24px 0' }}>
                                    No suggestions available yet.
                                </p>
                            )}
                        </div>

                        <button
                            type="button"
                            className={styles.submitBtn}
                            onClick={() => setStep(3)}
                            disabled={!canProceedStep2}
                        >
                            Continue
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M5 12h14m-7-7 7 7-7 7" />
                            </svg>
                        </button>
                    </>
                )}

                {/* ── STEP 3: Location ── */}
                {step === 3 && (
                    <>
                        <div className={styles.header}>
                            <h1 className={styles.title}>Where are you based?</h1>
                            <p className={styles.subtitle}>
                                Help us show you relevant products and sellers near you.
                            </p>
                        </div>

                        <div className={styles.form}>
                            <div className={styles.fieldGroup}>
                                <label className={styles.label}>City</label>
                                <div className={styles.inputWrapper}>
                                    <svg className={styles.inputIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
                                    </svg>
                                    <input
                                        type="text"
                                        className={styles.input}
                                        placeholder="e.g. Lagos"
                                        value={city}
                                        onChange={(e) => setCity(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className={styles.fieldGroup}>
                                <label className={styles.label}>State / Region</label>
                                <div className={styles.inputWrapper}>
                                    <svg className={styles.inputIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" />
                                    </svg>
                                    <input
                                        type="text"
                                        className={styles.input}
                                        placeholder="e.g. Lagos State"
                                        value={locationState}
                                        onChange={(e) => setLocationState(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className={styles.fieldGroup}>
                                <label className={styles.label}>Country</label>
                                <div className={styles.inputWrapper}>
                                    <svg className={styles.inputIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                                    </svg>
                                    <input
                                        type="text"
                                        className={styles.input}
                                        placeholder="e.g. Nigeria"
                                        value={country}
                                        onChange={(e) => setCountry(e.target.value)}
                                    />
                                </div>
                            </div>

                            <button
                                type="button"
                                className={styles.submitBtn}
                                onClick={handleStep3Submit}
                                disabled={step3Loading}
                            >
                                {step3Loading ? 'Saving...' : 'Continue'}
                                {!step3Loading && (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M5 12h14m-7-7 7 7-7 7" />
                                    </svg>
                                )}
                            </button>
                            <button
                                type="button"
                                className={styles.ghostBtn}
                                onClick={() => setStep(4)}
                            >
                                Skip for now
                            </button>
                        </div>
                    </>
                )}

                {/* ── STEP 5: Where did you hear about us ── */}
                {step === 5 && (() => {
                    const OPTIONS = [
                        { value: 'Friend / Word of mouth', emoji: '🗣️' },
                        { value: 'Twitter / X', emoji: '𝕏' },
                        { value: 'Instagram', emoji: '📸' },
                        { value: 'TikTok', emoji: '🎵' },
                        { value: 'WhatsApp / Telegram', emoji: '💬' },
                        { value: 'Google Search', emoji: '🔍' },
                        { value: 'School / University', emoji: '🎓' },
                        { value: 'Other', emoji: '✏️' },
                    ];
                    return (
                        <>
                            <div className={styles.header}>
                                <h1 className={styles.title}>One last thing 🙏</h1>
                                <p className={styles.subtitle}>How did you hear about DepMi? This helps us know where to focus.</p>
                            </div>

                            <div className={styles.interestGrid}>
                                {OPTIONS.map(opt => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        disabled={step5Loading}
                                        onClick={() => {
                                            setReferralSource(opt.value);
                                            if (opt.value !== 'Other') handleStep5Submit(opt.value);
                                        }}
                                        className={`${styles.interestChip} ${referralSource === opt.value ? styles.interestChipSelected : ''}`}
                                    >
                                        <span>{opt.emoji}</span>
                                        <span>{opt.value}</span>
                                    </button>
                                ))}
                            </div>

                            {referralSource === 'Other' && (
                                <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                                    <input
                                        type="text"
                                        className={styles.input}
                                        placeholder="Tell us where…"
                                        value={referralOther}
                                        onChange={e => setReferralOther(e.target.value)}
                                        autoFocus
                                        onKeyDown={e => { if (e.key === 'Enter' && referralOther.trim()) handleStep5Submit('Other'); }}
                                        style={{ flex: 1, padding: '12px 16px', borderRadius: 12, border: '1.5px solid var(--card-border)', background: 'var(--bg-elevated)', color: 'var(--text-main)', fontSize: '0.95rem' }}
                                    />
                                    <button
                                        type="button"
                                        className={styles.submitBtn}
                                        style={{ width: 'auto', padding: '0 20px' }}
                                        disabled={!referralOther.trim() || step5Loading}
                                        onClick={() => handleStep5Submit('Other')}
                                    >
                                        {step5Loading ? '…' : 'Go'}
                                    </button>
                                </div>
                            )}

                        </>
                    );
                })()}

                {/* ── STEP 4: Interests ── */}
                {step === 4 && (
                    <>
                        <div className={styles.header}>
                            <h1 className={styles.title}>What are you into?</h1>
                            <p className={styles.subtitle}>
                                Pick at least {MIN_INTERESTS} interests to personalise your feed.
                                {interests.size > 0 && ` (${interests.size} selected)`}
                            </p>
                        </div>

                        {step4Error && (
                            <div className={styles.error}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                                {step4Error}
                            </div>
                        )}

                        <div className={styles.interestGrid}>
                            {INTEREST_OPTIONS.map(opt => {
                                const selected = interests.has(opt.value);
                                return (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => toggleInterest(opt.value)}
                                        className={`${styles.interestChip} ${selected ? styles.interestChipSelected : ''}`}
                                    >
                                        <span>{opt.emoji}</span>
                                        <span>{opt.label}</span>
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            type="button"
                            className={styles.submitBtn}
                            onClick={handleFinish}
                            disabled={!canFinish}
                        >
                            Continue
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M5 12h14m-7-7 7 7-7 7" />
                            </svg>
                        </button>
                    </>
                )}
            </div>
        </main>
    );
}
