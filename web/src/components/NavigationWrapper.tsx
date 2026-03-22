'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import DesktopSidebar from './DesktopSidebar';

const GUEST_PAGES = ['/login', '/register', '/signup', '/waitlist'];

export default function NavigationWrapper({ children }: { children: React.ReactNode }) {
    const { status } = useSession();
    const pathname = usePathname();

    // Show sidebar for all users (including guests) unless on auth-only pages
    const isGuestPage = GUEST_PAGES.includes(pathname || '');
    const showSidebar = status !== 'loading' && !isGuestPage;

    return (
        <div className={showSidebar ? "page-layout" : ""}>
            {showSidebar && <DesktopSidebar />}
            <div className={showSidebar ? "desktop-content" : ""}>
                {children}
            </div>
        </div>
    );
}
