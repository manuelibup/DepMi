'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useAuthGate } from '@/context/AuthGate';
import { usePathname } from 'next/navigation';
import styles from './page.module.css';

interface Props {
    targetUserId: string;
    initialFollowing: boolean;
}

export default function ProfileFollowButton({ targetUserId, initialFollowing }: Props) {
    const { status } = useSession();
    const { openGate } = useAuthGate();
    const pathname = usePathname();
    const [following, setFollowing] = useState(initialFollowing);
    const [loading, setLoading] = useState(false);

    const toggle = async () => {
        if (status !== 'authenticated') {
            openGate('follow users', pathname ?? '/');
            return;
        }
        setLoading(true);
        try {
            const method = following ? 'DELETE' : 'POST';
            const res = await fetch('/api/users/follow', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetUserId }),
            });
            if (res.ok) setFollowing(!following);
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={toggle}
            disabled={loading}
            className={following ? styles.followingBtn : styles.followBtn}
        >
            {following ? 'Following' : 'Follow'}
        </button>
    );
}
