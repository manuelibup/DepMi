import React from 'react';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import EmptyState from '@/components/EmptyState';

export default function NotificationsPage() {
    return (
        <main style={{ minHeight: '100dvh', background: 'var(--bg-color)', paddingBottom: '80px' }}>
            <Header />
            <div style={{ paddingTop: '100px' }}>
                <EmptyState
                    title="No new notifications"
                    description="You're all caught up! When you get updates about bids, orders, or stores, they will appear here."
                />
            </div>
            <BottomNav />
        </main>
    );
}
