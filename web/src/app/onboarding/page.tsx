'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import styles from './page.module.css';

type CheckState = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

type Step = 1 | 2 | 3;

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

export default function OnboardingPage() {
    const { data: session, status, update } = useSession();
    const router = useRouter();

    const searchParams = useSearchParams();
    const isRepair = searchParams.get('repair') === '1';

    const [step, setStep] = useState<Step>(1);

    // ── Step 1 state ──
    const [username, setUsername] = useState('');
    const [displayName, setDisplayName] = useState('');
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

    // ── Step 3 state ──
    const [interests, setInterests] = useState<Set<string>>(new Set());
    const [step3Loading, setStep3Loading] = useState(false);
    const [step3Error, setStep3Error] = useState('');

    const minFollows = Math.min(10, suggestedUsers.length);

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
            const res = await fetch('/api/user/onboarding', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, displayName }),
            });

            const data = await res.json();

            if (!res.ok) {
                if (data.message?.toLowerCase().includes('taken')) {
                    setCheckState('taken');
                    setCheckMsg('Username just got taken — try another');
                }
                throw new Error(data.message || 'Failed to save username');
            }

            // Update JWT with new username before moving on
            await update({ username, name: displayName });

            if (isRepair) {
                // Repair flow: just complete onboarding and go home
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

    // ── Step 3: toggle interests ──
    const toggleInterest = (value: string) => {
        setInterests(prev => {
            const next = new Set(prev);
            if (next.has(value)) next.delete(value);
            else next.add(value);
            return next;
        });
    };

    // ── Step 3 submit (complete onboarding) ──
    const handleFinish = async () => {
        if (interests.size < MIN_INTERESTS) return;
        setStep3Loading(true);
        setStep3Error('');

        try {
            const res = await fetch('/api/user/complete-onboarding', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ interests: Array.from(interests) }),
            });

            if (!res.ok) throw new Error('Failed to complete onboarding');

            await update({ onboardingComplete: true });
            router.push('/');
            router.refresh();
        } catch (e: unknown) {
            setStep3Error(e instanceof Error ? e.message : 'Something went wrong');
        } finally {
            setStep3Loading(false);
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

    return (
        <main className={styles.main}>
            <div className={styles.bgBlob} />

            <div className={styles.container} style={step === 2 ? { maxWidth: 520 } : undefined}>

                {/* Step indicator (only for fresh onboarding) */}
                {!isRepair && (
                    <div className={styles.stepIndicator}>
                        {([1, 2, 3] as Step[]).map(s => (
                            <div
                                key={s}
                                className={`${styles.stepDot} ${step === s ? styles.stepDotActive : ''} ${step > s ? styles.stepDotDone : ''}`}
                            />
                        ))}
                    </div>
                )}

                {/* ── STEP 1: Username + display name ── */}
                {step === 1 && (
                    <>
                        <div className={styles.header}>
                            <h1 className={styles.title}>{isRepair ? 'Update your username' : 'Set up your profile'}</h1>
                            <p className={styles.subtitle}>
                                {isRepair
                                    ? 'Your current username contains spaces, which is no longer supported. Please choose a new handle.'
                                    : 'Choose a unique username to start discovery on DepMi.'}
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
                                <span>We've suggested a cleaned version for you below.</span>
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
                                    : minFollows > 0
                                        ? `Follow at least ${minFollows} account${minFollows > 1 ? 's' : ''} to curate your feed.`
                                        : 'Curate your DepMi feed by following accounts below.'}
                            </p>
                        </div>

                        {followedIds.size > 0 && (
                            <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600 }}>
                                {followedIds.size} following{minFollows > 0 ? ` · ${Math.max(0, minFollows - followedIds.size)} more to go` : ''}
                            </p>
                        )}

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

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                type="button"
                                className={styles.submitBtn}
                                onClick={() => setStep(3)}
                                disabled={!canProceedStep2}
                                style={{ flex: 1 }}
                            >
                                Continue
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M5 12h14m-7-7 7 7-7 7" />
                                </svg>
                            </button>
                            {suggestedUsers.length > 0 && followedIds.size < minFollows && (
                                <button
                                    type="button"
                                    onClick={() => setStep(3)}
                                    style={{
                                        padding: '0 20px',
                                        background: 'transparent',
                                        border: '1px solid var(--border)',
                                        borderRadius: 'var(--radius-md)',
                                        color: 'var(--text-muted)',
                                        cursor: 'pointer',
                                        fontSize: '0.9rem',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    Skip
                                </button>
                            )}
                        </div>
                    </>
                )}

                {/* ── STEP 3: Interests ── */}
                {step === 3 && (
                    <>
                        <div className={styles.header}>
                            <h1 className={styles.title}>What are you into?</h1>
                            <p className={styles.subtitle}>
                                Pick at least {MIN_INTERESTS} interests to personalise your feed.
                                {interests.size > 0 && ` (${interests.size} selected)`}
                            </p>
                        </div>

                        {step3Error && (
                            <div className={styles.error}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                                {step3Error}
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
                            disabled={!canFinish || step3Loading}
                        >
                            {step3Loading ? 'Setting up your feed...' : 'Finish & Explore DepMi'}
                            {!step3Loading && (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M5 12h14m-7-7 7 7-7 7" />
                                </svg>
                            )}
                        </button>
                    </>
                )}
            </div>
        </main>
    );
}
