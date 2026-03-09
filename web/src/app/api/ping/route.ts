import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
    try {
        await prisma.$queryRaw`SELECT 1`;
        return NextResponse.json({ ok: true, ts: new Date().toISOString() });
    } catch (err) {
        console.error("[ping] DB check failed:", err);
        return NextResponse.json({ ok: false }, { status: 503 });
    }
}
