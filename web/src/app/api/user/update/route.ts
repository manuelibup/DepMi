import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

const updateSchema = z.object({
    displayName: z.string().min(1).max(50).optional(),
    username: z.string().min(3).max(30).regex(/^[a-z0-9_]+$/, 'Only lowercase letters, numbers, and underscores').optional(),
    avatarUrl: z.string().url().optional().nullable(),
    coverUrl: z.string().url().optional().nullable(),
    bio: z.string().max(160).optional().nullable(),
    phoneNumber: z.string().min(7).max(20).optional().nullable(),
    address: z.string().max(200).optional().nullable(),
    city: z.string().max(100).optional().nullable(),
    state: z.string().max(100).optional().nullable(),
});

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                displayName: true,
                username: true,
                avatarUrl: true,
                coverUrl: true,
                bio: true,
                phoneNumber: true,
                address: true,
                city: true,
                state: true,
            }
        });

        return NextResponse.json({ user });

    } catch (error: unknown) {
        console.error('User Fetch Error:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const parsed = updateSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ message: 'Invalid input', errors: parsed.error.flatten().fieldErrors }, { status: 400 });
        }

        const { displayName, username, avatarUrl, coverUrl, bio, phoneNumber, address, city, state } = parsed.data;

        // Username uniqueness check
        if (username) {
            const conflict = await prisma.user.findFirst({
                where: { username, NOT: { id: session.user.id } }
            });
            if (conflict) {
                return NextResponse.json({ message: 'Username already taken' }, { status: 409 });
            }
        }

        const updated = await prisma.user.update({
            where: { id: session.user.id },
            data: {
                ...(displayName !== undefined && { displayName }),
                ...(username !== undefined && { username }),
                ...(avatarUrl !== undefined && { avatarUrl }),
                ...(coverUrl !== undefined && { coverUrl }),
                ...(bio !== undefined && { bio }),
                ...(phoneNumber !== undefined && { phoneNumber }),
                ...(address !== undefined && { address }),
                ...(city !== undefined && { city }),
                ...(state !== undefined && { state }),
            },
            select: { id: true, displayName: true, username: true, avatarUrl: true }
        });

        return NextResponse.json({ message: 'Profile updated', user: updated });

    } catch (error: unknown) {
        console.error('User Update Error:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
