'use client';

import React from 'react';
import { useAuthGate } from '@/context/AuthGate';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import styles from './RequestDetail.module.css';

export default function BidActionGate({ isLoggedIn }: { isLoggedIn: boolean }) {
    const { openGate } = useAuthGate();
    const pathname = usePathname();

    if (!isLoggedIn) {
        // Guest State: Fire the AuthGate
        return (
            <button 
                onClick={() => openGate('bid on this request', pathname)}
                className={styles.gateBtn}
            >
                Log in to Place a Bid
            </button>
        );
    }

    // Auth Buyer w/ No Store State: Redirect to store creation
    return (
        <div className={styles.noStoreGate}>
            <p className={styles.gateMsg}>You must have an active store to bid on requests.</p>
            <Link href="/store/create" className={styles.gateBtn}>
                Create a Store
            </Link>
        </div>
    );
}
