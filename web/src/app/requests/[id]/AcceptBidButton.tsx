'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './RequestDetail.module.css';

export default function AcceptBidButton({ bidId, demandId }: { bidId: string, demandId: string }) {
    const router = useRouter();
    const [status, setStatus] = useState<'idle' | 'confirm' | 'loading' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');

    const handleAccept = async () => {
        setStatus('loading');
        setErrorMsg('');
        try {
            const res = await fetch('/api/bids/accept', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bidId, demandId }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Failed to accept bid');
            }

            setStatus('success');
            // Hard refresh or push to order page eventually
            router.refresh();
        } catch (err: unknown) {
            setStatus('error');
            setErrorMsg(err instanceof Error ? err.message : 'An error occurred.');
        }
    };

    if (status === 'success') {
        return <p className={styles.successState} style={{ padding: '8px', marginTop: 4 }}>✓ Accepted</p>;
    }

    if (status === 'confirm') {
         return (
             <div style={{ marginTop: 8 }}>
                 <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: 8 }}>Accepting this bid will close the request. Proceed?</p>
                 <div style={{ display: 'flex', gap: 8 }}>
                      <button 
                          onClick={handleAccept} 
                          className={styles.acceptBtn}
                          style={{ flex: 1 }}
                      >
                          Confirm
                      </button>
                      <button
                          onClick={() => setStatus('idle')}
                          className={styles.acceptBtn}
                          style={{ flex: 1, backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--card-border)', color: 'var(--text-main)' }}
                      >
                          Cancel
                      </button>
                 </div>
             </div>
         );
    }

    return (
        <div style={{ marginTop: 8 }}>
            <button 
                onClick={() => setStatus('confirm')} 
                disabled={status === 'loading'}
                className={styles.acceptBtn}
                style={{ width: '100%' }}
            >
                {status === 'loading' ? 'Accepting...' : 'Accept Bid'}
            </button>
            {errorMsg && <p style={{ color: 'var(--error)', fontSize: '0.875rem', marginTop: 4 }}>{errorMsg}</p>}
        </div>
    );
}
