import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const VALID_RE = /^[a-z0-9_]+$/;

export async function GET(req: NextRequest) {
    const username = req.nextUrl.searchParams.get("username")?.toLowerCase().trim() ?? "";

    if (username.length < 3)  return NextResponse.json({ available: false, reason: "Too short (min 3 characters)" });
    if (username.length > 20) return NextResponse.json({ available: false, reason: "Too long (max 20 characters)" });
    if (!VALID_RE.test(username)) return NextResponse.json({ available: false, reason: "Letters, numbers, underscores only" });

    const existing = await prisma.user.findUnique({ where: { username }, select: { id: true } });
    if (existing) return NextResponse.json({ available: false, reason: "Username already taken" });

    return NextResponse.json({ available: true });
}
