import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';

const ADMIN_EMAILS = [process.env.ADMIN_EMAIL || 'admin@depmi.com'];

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
        const inviteUrl = `${process.env.NEXTAUTH_URL}/register?type=vendor&invite=${invite.id}`;

        return NextResponse.json({ inviteUrl, inviteId: invite.id });
    } catch (error) {
        console.error('Invite API Error:', error);
        return NextResponse.json({ error: 'Failed to generate invite' }, { status: 500 });
    }
}
