import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const VALID_RE = /^[a-z0-9_]+$/;

// Reserved — top-level app routes that would be shadowed by /[handle]
const RESERVED = new Set([
    'about', 'blog', 'help', 'terms', 'privacy', 'careers',
    'store', 'p', 'requests', 'orders', 'messages', 'notifications',
    'bookmarks', 'settings', 'onboarding', 'search', 'feed', 'profile',
    'admin', 'u', 'api', 'login', 'register', 'logout',
    'depmi', 'support', 'contact', 'home', 'explore', 'trending',
]);

export async function GET(req: NextRequest) {
    const username = req.nextUrl.searchParams.get("username")?.toLowerCase().trim() ?? "";

    if (username.length < 3)  return NextResponse.json({ available: false, reason: "Too short (min 3 characters)" });
    if (username.length > 20) return NextResponse.json({ available: false, reason: "Too long (max 20 characters)" });
    if (!VALID_RE.test(username)) return NextResponse.json({ available: false, reason: "Letters, numbers, underscores only" });
    if (RESERVED.has(username)) return NextResponse.json({ available: false, reason: "That username is reserved" });

    const [existingUser, existingStore] = await Promise.all([
        prisma.user.findUnique({ where: { username }, select: { id: true } }),
        prisma.store.findFirst({ where: { slug: username }, select: { id: true } }),
    ]);
    if (existingUser || existingStore) return NextResponse.json({ available: false, reason: "Username already taken" });

    return NextResponse.json({ available: true });
}
