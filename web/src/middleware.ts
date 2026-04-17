import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

const MAINTENANCE_MODE = false;

// Routes that require authentication (unauthenticated users → /login)
const AUTH_REQUIRED = [
    '/orders',
    '/profile',
    '/demand/new',
    '/store/create',
    '/admin',
    '/settings',
    '/messages',
];

// Routes exempt from the "must complete onboarding" redirect
// (onboarding itself, auth flows, APIs, and static files are handled by the matcher)
const USERNAME_EXEMPT = [
    '/onboarding',
    '/login',
    '/register',
    '/api/',
    '/checkout',
];

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    const isLocalhost = req.headers.get('host')?.includes('localhost');
    if (MAINTENANCE_MODE && !isLocalhost && pathname !== '/maintenance' && !pathname.startsWith('/api/') && !pathname.startsWith('/blog')) {
        return NextResponse.redirect(new URL('/maintenance', req.url));
    }

    // Canonical Redirects: Migrate from next.config.ts to avoid regex lookahead failures.
    if (pathname === '/home') {
        return NextResponse.redirect(new URL('/', req.url), 308); // 308 Permanent Redirect
    }

    // /u/[username] → /[username] — only redirect the base profile, not nested paths
    // (e.g. /u/manuel/followers must stay at /u/manuel/followers so that route works)
    if (pathname.startsWith('/u/')) {
        const rest = pathname.substring(3); // "manuel" or "manuel/followers"
        const username = rest.split('/')[0];
        if (username && !rest.includes('/')) {
            return NextResponse.redirect(new URL(`/${username}`, req.url), 308);
        }
    }

    // /store/[slug] → /[slug] — only redirect the base store profile, not nested routes
    // Nested routes like /store/[slug]/products/new must remain intact
    if (pathname.startsWith('/store/')) {
        const rest = pathname.substring(7); // "foo" or "foo/products/new"
        const slug = rest.split('/')[0];
        if (slug && slug !== 'create' && !rest.includes('/')) {
            return NextResponse.redirect(new URL(`/${slug}`, req.url), 308);
        }
    }

    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    // 1. Force onboarding for logged-in users who haven't completed setup.
    // Dual check: onboardingComplete (new) OR username (legacy fallback for existing users
    // before the onboardingComplete column existed). Remove !token.username after backfill.
    const isExempt = USERNAME_EXEMPT.some(p => pathname.startsWith(p));
    if (token && !token.onboardingComplete && !isExempt) {
        return NextResponse.redirect(new URL('/onboarding', req.url));
    }

    // 2. Protect auth-required routes from unauthenticated users
    const isProtected = AUTH_REQUIRED.some(
        p => pathname === p || pathname.startsWith(p + '/')
    );
    if (isProtected && !token) {
        const callbackUrl = encodeURIComponent(pathname);
        return NextResponse.redirect(new URL(`/login?callbackUrl=${callbackUrl}`, req.url));
    }

    // 3. Admin routes require an adminRole in the token
    if (pathname.startsWith('/admin') && token && !token.adminRole) {
        return NextResponse.redirect(new URL('/', req.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        // Run on all routes except Next.js internals, static assets, and lightweight APIs
        '/((?!_next/static|_next/image|favicon.ico|api/og|api/activity/ping|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
