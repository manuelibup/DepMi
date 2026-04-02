'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import InputField from '@/components/Auth/InputField';
import SocialLoginButton from '@/components/Auth/SocialLoginButton';
import styles from '@/components/Auth/Auth.module.css';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        const res = await signIn('credentials', {
            redirect: false,
            email,
            password,
        });

        if (res?.error) {
            setError(res.error);
            setIsLoading(false);
        } else {
            router.push('/');
            router.refresh();
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Welcome back</h1>
                <p className={styles.subtitle}>Log in to DepMi to continue</p>
            </div>

            <div className={styles.form}>
                {error && <div className={styles.alertError}>{error}</div>}

                <SocialLoginButton
                    provider="google"
                    onClick={() => signIn('google', { callbackUrl: '/' })}
                />
            </div>

            <div className={styles.footer}>
                Don&apos;t have an account? <Link href="/" className={styles.link}>Sign up</Link>
            </div>
        </div>
    );
}
