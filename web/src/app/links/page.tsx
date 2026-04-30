'use client';

import { useState } from 'react';
import styles from './links.module.css';

export default function LinksPage() {
    const [url, setUrl] = useState('');
    const [reason, setReason] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setStatus('loading');
        setMessage('');

        try {
            const res = await fetch('/api/links/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url, reason }),
            });
            const data = await res.json();
            if (res.ok) {
                setStatus('success');
                setMessage(data.message);
                setUrl('');
                setReason('');
            } else {
                setStatus('error');
                setMessage(data.error || 'Something went wrong.');
            }
        } catch {
            setStatus('error');
            setMessage('Could not submit. Please try again.');
        }
    }

    return (
        <div className={styles.page}>
            <div className={styles.card}>
                <h1 className={styles.title}>Request Link Approval</h1>
                <p className={styles.subtitle}>
                    External links are not allowed on DepMi by default. If you have a specific
                    link you'd like to share (e.g. a product catalogue, a trusted resource), submit
                    it here for review. Once approved, anyone can post links from that domain freely.
                </p>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <label className={styles.label}>
                        Link URL
                        <input
                            type="url"
                            className={styles.input}
                            placeholder="https://example.com/page"
                            value={url}
                            onChange={e => setUrl(e.target.value)}
                            required
                        />
                    </label>

                    <label className={styles.label}>
                        Why should this be approved?
                        <textarea
                            className={styles.textarea}
                            placeholder="Explain what this link is and why it's relevant to the DepMi community…"
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            required
                            minLength={10}
                            maxLength={500}
                            rows={4}
                        />
                    </label>

                    <button
                        type="submit"
                        className={styles.btn}
                        disabled={status === 'loading'}
                    >
                        {status === 'loading' ? 'Submitting…' : 'Submit for Review'}
                    </button>
                </form>

                {message && (
                    <p className={status === 'error' ? styles.error : styles.success}>
                        {message}
                    </p>
                )}

                <div className={styles.note}>
                    <strong>Note:</strong> Submitting unapproved links in posts or comments will result
                    in a strike. If you receive a strike for a link you believe should be allowed,
                    submit it here for review before posting again.
                </div>
            </div>
        </div>
    );
}
