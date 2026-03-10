'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import DesktopSidebar from './DesktopSidebar';

const GUEST_PAGES = ['/login', '/register', '/signup', '/waitlist'];

export default function NavigationWrapper({ children }: { children: React.ReactNode }) {
    const { status } = useSession();
    const pathname = usePathname();

    // Show sidebar if authenticated, unless explicitly on a guest page
    const isGuestPage = GUEST_PAGES.includes(pathname || '');
    const showSidebar = status === 'authenticated' && !isGuestPage;

    return (
        <>
            {showSidebar && <DesktopSidebar />}
            <div className={showSidebar ? "desktop-content" : ""}>
                {children}
            </div>
        </>
    );
}
