import React from 'react';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import BackButton from '@/components/BackButton';

interface FollowersPageProps {
    params: Promise<{ username: string }>;
}

export default async function FollowersPage({ params }: FollowersPageProps) {
    const { username } = await params;

    const user = await (prisma.user as any).findFirst({
        where: { username: { equals: username, mode: 'insensitive' } },
        select: { id: true, username: true, displayName: true },
    }) as { id: string; username: string; displayName: string } | null;

    if (!user) notFound();

    const follows = await (prisma as any).userFollow.findMany({
        where: { followingId: user.id },
        orderBy: { createdAt: 'desc' },
        include: {
            follower: {
                select: {
                    id: true,
                    username: true,
                    displayName: true,
                    avatarUrl: true,
                    bio: true,
                },
            },
        },
    }) as Array<{
        follower: {
            id: string;
            username: string;
            displayName: string;
            avatarUrl: string | null;
            bio: string | null;
        };
    }>;

    return (
        <main style={{ maxWidth: 600, margin: '0 auto', minHeight: '100vh', background: 'var(--bg-color)', paddingBottom: 80 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--card-border)', position: 'sticky', top: 0, background: 'var(--bg-color)', zIndex: 10 }}>
                <BackButton />
                <div>
                    <p style={{ margin: 0, fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)' }}>
                        {user.displayName}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Followers &middot; {follows.length}
                    </p>
                </div>
            </div>

            {/* List */}
            {follows.length === 0 ? (
                <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    No followers yet.
                </div>
            ) : (
                <div>
                    {follows.map(({ follower }) => (
                        <Link
                            key={follower.id}
                            href={`/u/${follower.username}`}
                            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: '1px solid var(--card-border)', textDecoration: 'none', transition: 'background 0.15s' }}
                        >
                            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--bg-elevated)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {follower.avatarUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={follower.avatarUrl} alt={follower.displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--primary)' }}>
                                        {follower.displayName.charAt(0).toUpperCase()}
                                    </span>
                                )}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                                    {follower.displayName}
                                </p>
                                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    @{follower.username}
                                </p>
                                {follower.bio && (
                                    <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {follower.bio}
                                    </p>
                                )}
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </main>
    );
}
