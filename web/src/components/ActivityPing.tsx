'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';

const PING_KEY = '_dm_last_ping';
const PING_INTERVAL = 30 * 60 * 1000; // 30 minutes

export default function ActivityPing() {
    const { status } = useSession();

    useEffect(() => {
        if (status !== 'authenticated') return;

        const lastPing = localStorage.getItem(PING_KEY);
        const now = Date.now();

        if (lastPing && now - parseInt(lastPing, 10) < PING_INTERVAL) {
            return; // Skip: already pinged recently
        }

        fetch('/api/activity/ping', { method: 'POST' })
            .then((res) => {
                if (res.ok) {
                    localStorage.setItem(PING_KEY, now.toString());
                }
            })
            .catch(() => {});
    }, [status]);

    return null;
}
