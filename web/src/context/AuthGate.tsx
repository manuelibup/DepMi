'use client';

import {
    createContext,
    useCallback,
    useContext,
    useState,
    type ReactNode,
} from 'react';
import Link from 'next/link';
import styles from './AuthGate.module.css';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AuthGateState {
    isOpen: boolean;
    hint: string;
    callbackUrl: string;
}

interface AuthGateContextValue {
    /** Open the sign-up gate. hint = reason shown to the user, callbackUrl = where to send them after auth */
    openGate: (hint?: string, callbackUrl?: string) => void;
    closeGate: () => void;
}

// ── Context ───────────────────────────────────────────────────────────────────

const AuthGateContext = createContext<AuthGateContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthGateProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<AuthGateState>({
        isOpen: false,
        hint: '',
        callbackUrl: '/',
    });

    const openGate = useCallback((hint = '', callbackUrl = '/') => {
        setState({ isOpen: true, hint, callbackUrl });
    }, []);

    const closeGate = useCallback(() => {
        setState((prev) => ({ ...prev, isOpen: false }));
    }, []);

    const loginHref = `/login?callbackUrl=${encodeURIComponent(state.callbackUrl)}`;
    const registerHref = `/welcome`;

    return (
        <AuthGateContext.Provider value={{ openGate, closeGate }}>
            {children}

            {state.isOpen && (
                <div className={styles.overlay} onClick={closeGate}>
                    <div
                        className={styles.sheet}
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-label="Join DepMi"
                    >
                        <div className={styles.handle} />

                        <div className={styles.icon}>🛒</div>

                        <h2 className={styles.title}>Join DepMi</h2>
                        <p className={styles.body}>
                            {state.hint
                                ? `Sign up to ${state.hint}.`
                                : 'Create a free account to get started.'}
                        </p>

                        <div className={styles.actions}>
                            <Link
                                href={registerHref}
                                className={styles.primaryBtn}
                                onClick={closeGate}
                            >
                                Create Account — It&apos;s Free
                            </Link>
                            <Link
                                href={loginHref}
                                className={styles.secondaryBtn}
                                onClick={closeGate}
                            >
                                Already have an account? Log in
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </AuthGateContext.Provider>
    );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAuthGate() {
    const ctx = useContext(AuthGateContext);
    if (!ctx) throw new Error('useAuthGate must be used inside AuthGateProvider');
    return ctx;
}
