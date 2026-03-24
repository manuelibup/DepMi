import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireAdmin, AdminRole } from '@/lib/admin';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import styles from './layout.module.css';

const NAV = [
  {
    label: 'Overview', href: '/admin/dashboard', minRole: 'MODERATOR' as AdminRole,
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
  },
  {
    label: 'Engagement', href: '/admin/engagement', minRole: 'MODERATOR' as AdminRole,
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
  },
  {
    label: 'Commerce', href: '/admin/commerce', minRole: 'ADMIN' as AdminRole,
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" /></svg>
  },
  {
    label: 'Users', href: '/admin/users', minRole: 'ADMIN' as AdminRole,
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
  },
  {
    label: 'Stores', href: '/admin/stores', minRole: 'ADMIN' as AdminRole,
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
  },
  {
    label: 'Referrals', href: '/admin/referrals', minRole: 'SUPER_ADMIN' as AdminRole,
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
  },
  {
    label: 'Admins', href: '/admin/admins', minRole: 'SUPER_ADMIN' as AdminRole,
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
  },
  {
    label: 'Messages', href: '/admin/messages', minRole: 'ADMIN' as AdminRole,
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
  },
  {
    label: 'Announce', href: '/admin/announce', minRole: 'ADMIN' as AdminRole,
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10.5V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h12.5" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /><path d="M18 14v4" /><path d="M18 22v.01" /></svg>
  },
  {
    label: 'Analytics', href: '/admin/analytics', minRole: 'ADMIN' as AdminRole,
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
  },
];

const ROLE_RANK: Record<AdminRole, number> = { MODERATOR: 1, ADMIN: 2, SUPER_ADMIN: 3 };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const check = requireAdmin(session, 'MODERATOR');
  if (!check.ok) redirect('/');

  const dbUser = await prisma.user.findUnique({
    where: { id: session!.user.id },
    select: { totpEnabled: true, adminPinHash: true }
  });

  if (dbUser) {
    const needsSetup = !dbUser.totpEnabled || !dbUser.adminPinHash;
    const needsVerification = !session!.user.twoFaVerified || !session!.user.adminPinVerified;
    if (needsSetup || needsVerification) {
      redirect('/secure-admin');
    }
  }

  const role = check.role;
  const visibleNav = NAV.filter(item => ROLE_RANK[role] >= ROLE_RANK[item.minRole]);

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <span className={styles.logo}>DepMi</span>
          <span className={styles.roleBadge}>{role.replace('_', ' ')}</span>
        </div>
        <nav className={styles.nav}>
          {visibleNav.map(item => (
            <Link key={item.href} href={item.href} className={styles.navItem}>
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <Link href="/" className={styles.backLink}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          Back to App
        </Link>
      </aside>
      <main className={styles.content}>
        {children}
      </main>
    </div>
  );
}
