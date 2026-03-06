import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { userId } = body; // The ID of the user to start a chat with

        if (!userId) {
            return NextResponse.json({ message: 'User ID is required' }, { status: 400 });
        }

        if (userId === session.user.id) {
            return NextResponse.json({ message: 'Cannot message yourself' }, { status: 400 });
        }

        // Check if a conversation already exists between these EXACT two users
        // This is a bit tricky with Prisma many-to-many, so we'll do:
        const existingConv = await prisma.conversation.findFirst({
            where: {
                AND: [
                    { participants: { some: { id: session.user.id } } },
                    { participants: { some: { id: userId } } }
                ]
            },
            include: { participants: true }
        });

        // Ensure it's exactly those two (in case group chats ever get added)
        const exactMatch = existingConv && existingConv.participants.length === 2;

        if (exactMatch) {
            return NextResponse.json({ conversationId: existingConv.id });
        }

        // Otherwise create a new one
        const newConv = await prisma.conversation.create({
            data: {
                participants: {
                    connect: [{ id: session.user.id }, { id: userId }]
                }
            }
        });

        return NextResponse.json({ conversationId: newConv.id }, { status: 201 });

    } catch (error) {
        console.error('Create conversation error', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
