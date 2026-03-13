'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';

export default function ActivityPing() {
    const { status } = useSession();

    useEffect(() => {
        if (status !== 'authenticated') return;
        fetch('/api/activity/ping', { method: 'POST' }).catch(() => {});
    }, [status]);

    return null;
}
