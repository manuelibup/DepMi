import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import Link from 'next/link';

// Comma-separated list in ADMIN_EMAILS env var — no fallback (fail closed)
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

import InviteForm from './InviteForm';

export default async function AdminDashboard() {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email || ADMIN_EMAILS.length === 0 || !ADMIN_EMAILS.includes(session.user.email.toLowerCase())) {
        redirect('/');
    }

    return (
        <main style={{ minHeight: '100vh', background: 'var(--bg-color)', paddingBottom: '100px' }}>
            <Header />
            
            <div style={{ padding: '24px 20px', maxWidth: '800px', margin: '0 auto' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px' }}>Admin Dashboard 🛡️</h1>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Platform management and operation tools.</p>

                <div style={{ display: 'grid', gap: '20px' }}>
                    {/* Invite Tool */}
                    <section style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '16px', padding: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                            <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'rgba(255, 215, 0, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
                            </div>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Vendor Invites</h2>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px' }}>
                            Generate an invite link to onboard a new pilot store. The user will be automatically elevated to <b>TIER_2 (BVN Verified)</b> after signing up via this link.
                        </p>
                        
                        <InviteForm />
                    </section>

                    {/* Stats Summary */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '16px', padding: '20px' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Active Stores</span>
                            <p style={{ fontSize: '1.5rem', fontWeight: 800, margin: '4px 0 0' }}>Pilot Phase</p>
                        </div>
                        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '16px', padding: '20px' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total GMV</span>
                            <p style={{ fontSize: '1.5rem', fontWeight: 800, margin: '4px 0 0' }}>₦0.00</p>
                        </div>
                    </div>
                </div>
            </div>

            <BottomNav />
        </main>
    );
}

