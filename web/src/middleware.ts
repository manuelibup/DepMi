import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

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

// Routes exempt from the "must have a username" redirect
// (onboarding itself, auth flows, APIs, and static files are handled by the matcher)
const USERNAME_EXEMPT = [
    '/onboarding',
    '/login',
    '/register',
    '/api/',
];

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    // 1. Force username setup for logged-in users without a username
    const isExempt = USERNAME_EXEMPT.some(p => pathname.startsWith(p));
    if (token && !token.username && !isExempt) {
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

    return NextResponse.next();
}

export const config = {
    matcher: [
        // Run on all routes except Next.js internals and static assets
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
