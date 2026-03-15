import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AnnounceForm from './AnnounceForm';

export default async function AnnouncePage() {
    const session = await getServerSession(authOptions);
    const role = session?.user?.adminRole;
    if (!role || !['SUPER_ADMIN', 'ADMIN'].includes(role)) {
        redirect('/admin/dashboard');
    }

    return (
        <div style={{ padding: '32px 24px', maxWidth: 640 }}>
            <h1 style={{ margin: '0 0 8px', fontSize: '1.5rem', fontWeight: 800 }}>Broadcast Announcement</h1>
            <p style={{ margin: '0 0 32px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Send an in-app notification to all active users. Use this for app updates, new features, or important news.
            </p>
            <AnnounceForm />
        </div>
    );
}
