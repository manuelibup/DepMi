import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ count: 0 });
    }

    const count = await prisma.message.count({
        where: {
            conversation: {
                participants: {
                    some: { id: session.user.id }
                }
            },
            senderId: { not: session.user.id },
            read: false
        }
    });

    return NextResponse.json({ count });
}
