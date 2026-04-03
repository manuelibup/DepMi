import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";

// POST /api/user/match-contacts
// Body: { hashes: string[] }  — SHA-256 hashes of E.164 phone numbers (hashed client-side)
// Returns DepMi users whose hashed phoneNumber matches one of the submitted hashes.
// Raw phone numbers are never sent or stored — only hashes are compared.

const MAX_HASHES = 500;

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const hashes: unknown[] = Array.isArray(body.hashes) ? body.hashes : [];

    if (hashes.length === 0) {
        return NextResponse.json({ users: [] });
    }

    // Validate: only accept lowercase hex SHA-256 strings
    const validHashes = hashes
        .filter((h): h is string => typeof h === 'string' && /^[a-f0-9]{64}$/.test(h))
        .slice(0, MAX_HASHES);

    if (validHashes.length === 0) {
        return NextResponse.json({ users: [] });
    }

    // Fetch all users who have a phone number (excluding self)
    // Then hash each number server-side and check for intersection.
    // We never expose raw numbers — only return public profile fields.
    const usersWithPhone = await prisma.user.findMany({
        where: {
            phoneNumber: { not: null },
            onboardingComplete: true,
            id: { not: session.user.id },
        },
        select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            bio: true,
            phoneNumber: true,
            _count: { select: { followers: true } },
        },
    });

    const hashSet = new Set(validHashes);

    const matched = usersWithPhone
        .filter((u) => {
            if (!u.phoneNumber) return false;
            // Normalise to E.164-ish: strip non-digits then hash
            const normalised = u.phoneNumber.replace(/\D/g, '');
            const hashed = createHash('sha256').update(normalised).digest('hex');
            return hashSet.has(hashed);
        })
        .map(({ phoneNumber: _p, ...pub }) => pub); // strip phone before returning

    return NextResponse.json({ users: matched });
}
