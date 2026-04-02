'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import InputField from '@/components/Auth/InputField';
import SocialLoginButton from '@/components/Auth/SocialLoginButton';
import styles from '@/components/Auth/Auth.module.css';

export default function RegisterPage() {
    const router = useRouter();

    // Redirect /register → landing page
    useEffect(() => { router.replace('/'); }, [router]);
    return null;

    const [formData, setFormData] = useState({
        username: '',
        displayName: '',
        email: '',
        password: '',
        dateOfBirth: '',
    });

    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value;
        if (e.target.name === 'username') {
            value = value.toLowerCase().replace(/[^a-z0-9_]/g, '');
        }
        setFormData(prev => ({ ...prev, [e.target.name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (!res.ok) {
                if (data.errors && Array.isArray(data.errors)) {
                    // Zod error array
                    setError(data.errors[0].message);
                } else {
                    setError(data.message || 'Something went wrong');
                }
                setIsLoading(false);
                return;
            }

            // Automatically sign in the user after successful registration
            const signInRes = await signIn('credentials', {
                redirect: false,
                email: formData.email,
                password: formData.password,
            });

            if (signInRes?.error) {
                setError(signInRes.error);
                setIsLoading(false);
            } else {
                router.push('/');
                router.refresh();
            }
        } catch (err) {
            console.error(err);
            setError('An unexpected error occurred. Please try again.');
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Create an account</h1>
                <p className={styles.subtitle}>Join DepMi to start buying and selling</p>
            </div>

            <div className={styles.form}>
                {error && <div className={styles.alertError}>{error}</div>}

                <SocialLoginButton
                    provider="google"
                    onClick={() => signIn('google', { callbackUrl: '/' })}
                />
            </div>

            <div className={styles.footer}>
                Already have an account? <Link href="/login" className={styles.link}>Sign in</Link>
            </div>
        </div>
    );
}
