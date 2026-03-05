'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useAuthGate } from '@/context/AuthGate';
import { Bell, BellOff, UserPlus, UserCheck } from 'lucide-react';
import styles from './FollowButton.module.css';

interface FollowButtonProps {
    storeSlug: string;
    initialFollowersCount: number;
}

export default function FollowButton({ storeSlug, initialFollowersCount }: FollowButtonProps) {
    const { status } = useSession();
    const { openGate } = useAuthGate();
    
    const [isFollowing, setIsFollowing] = useState(false);
    const [notify, setNotify] = useState(false);
    const [followersCount, setFollowersCount] = useState(initialFollowersCount);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (status === 'authenticated') {
            fetch(`/api/store/${storeSlug}/follow`)
                .then(res => res.json())
                .then(data => {
                    setIsFollowing(data.isFollowing);
                    setNotify(data.notify);
                    setIsLoading(false);
                })
                .catch(() => setIsLoading(false));
        } else {
            setIsLoading(false);
        }
    }, [storeSlug, status]);

    const handleToggleFollow = async () => {
        if (status === 'unauthenticated') {
            openGate('Sign in to follow this store');
            return;
        }

        const previousIsFollowing = isFollowing;
        const previousCount = followersCount;

        // Optimistic UI update
        setIsFollowing(!isFollowing);
        setFollowersCount(isFollowing ? followersCount - 1 : followersCount + 1);
        if (!isFollowing) setNotify(true); // Default to notify on when following

        try {
            const res = await fetch(`/api/store/${storeSlug}/follow`, {
                method: 'POST',
            });

            if (!res.ok) throw new Error('Failed to toggle follow');

            const data = await res.json();
            setIsFollowing(data.isFollowing);
            setNotify(data.notify);
        } catch (error) {
            // Revert on failure
            setIsFollowing(previousIsFollowing);
            setFollowersCount(previousCount);
        }
    };

    const handleToggleNotify = async (e: React.MouseEvent) => {
        e.stopPropagation(); // prevent triggering the follow button if they are nested/adjacent
        
        if (!isFollowing) return;

        const previousNotify = notify;
        setNotify(!notify); // Optimistic

        try {
            const res = await fetch(`/api/store/${storeSlug}/follow`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notify: !previousNotify })
            });

            if (!res.ok) throw new Error('Failed to toggle notifications');
            
            const data = await res.json();
            setNotify(data.notify);
        } catch (error) {
            setNotify(previousNotify); // Revert
        }
    };

    if (isLoading) {
        return <div className={`${styles.skeleton} ${styles.followBtn}`} />;
    }

    return (
        <div className={styles.followContainer}>
            <button 
                onClick={handleToggleFollow} 
                className={`${styles.followBtn} ${isFollowing ? styles.following : ''}`}
            >
                {isFollowing ? (
                    <>
                        <UserCheck size={16} />
                        Following
                    </>
                ) : (
                    <>
                        <UserPlus size={16} />
                        Follow
                    </>
                )}
            </button>
            <span className={styles.followersCount}>
                {followersCount.toLocaleString()} followers
            </span>

            {isFollowing && (
                <button 
                    onClick={handleToggleNotify}
                    className={`${styles.bellBtn} ${notify ? styles.bellActive : ''}`}
                    aria-label={notify ? 'Mute notifications' : 'Enable notifications'}
                    title={notify ? 'Mute notifications' : 'Enable notifications'}
                >
                    {notify ? <Bell size={18} /> : <BellOff size={18} />}
                </button>
            )}
        </div>
    );
}
