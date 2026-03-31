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

    if (pathname.startsWith('/u/')) {
        const username = pathname.substring(3);
        if (username) {
            return NextResponse.redirect(new URL(`/${username}`, req.url), 308);
        }
    }

    if (pathname.startsWith('/store/')) {
        const slug = pathname.substring(7);
        // Exclude reserved routes explicitly
        if (slug && !slug.startsWith('create')) {
            // Keep nested paths intact, e.g. /store/foo/products -> /foo/products
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
        // Run on all routes except Next.js internals and static assets
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
