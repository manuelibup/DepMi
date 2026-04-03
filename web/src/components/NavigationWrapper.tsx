'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import DesktopSidebar from './DesktopSidebar';

const GUEST_PAGES = ['/login', '/register', '/signup', '/waitlist', '/welcome'];

export default function NavigationWrapper({ children }: { children: React.ReactNode }) {
    const { status } = useSession();
    const pathname = usePathname();

    const isAdminPage = (pathname || '').startsWith('/admin') || (pathname || '').startsWith('/secure-admin');
    const isGuestPage = GUEST_PAGES.includes(pathname || '');
    const showSidebar = status !== 'loading' && !isGuestPage && !isAdminPage;

    // Admin pages manage their own layout — render children bare
    if (isAdminPage) {
        return <>{children}</>;
    }

    return (
        <div className={showSidebar ? "page-layout" : ""}>
            {showSidebar && <DesktopSidebar />}
            <div className={showSidebar ? "desktop-content" : ""}>
                {children}
            </div>
        </div>
    );
}
