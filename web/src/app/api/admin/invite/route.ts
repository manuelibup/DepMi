import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    const check = requireAdmin(session, 'ADMIN');
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

    try {
        const { email } = await req.json();
        if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 });

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const invite = await prisma.storeInvite.create({
            data: {
                id: uuidv4(),
                email: email.toLowerCase(),
                expiresAt,
                status: 'PENDING'
            }
        });

        // The join URL format
        const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://depmi.com';
        const inviteUrl = `${baseUrl}/register?type=vendor&invite=${invite.id}`;

        return NextResponse.json({ inviteUrl, inviteId: invite.id });
    } catch (error) {
        console.error('Invite API Error:', error);
        return NextResponse.json({ error: 'Failed to generate invite' }, { status: 500 });
    }
}
