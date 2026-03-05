import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Toggle Follow / Notify preference
export async function POST(
    req: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        const { slug } = await params;

        if (!session?.user?.id) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        // The body is optional — they might just be tapping the Follow button
        // or tapping the Bell icon to toggle notifications
        const bodyText = await req.text();
        const body = bodyText ? JSON.parse(bodyText) : {};
        const { notify } = body;

        // 1. Find the store by slug
        const store = await prisma.store.findUnique({
            where: { slug },
            select: { id: true }
        });

        if (!store) {
            return NextResponse.json({ message: 'Store not found' }, { status: 404 });
        }

        const storeId = store.id;
        const userId = session.user.id;

        // 2. Check existing relationship
        const existingFollow = await prisma.storeFollow.findUnique({
            where: {
                userId_storeId: { userId, storeId }
            }
        });

        if (existingFollow) {
            // If they explicitly passed `notify`, they just want to mute/unmute alerts
            if (typeof notify === 'boolean' && notify !== existingFollow.notify) {
                const updated = await prisma.storeFollow.update({
                    where: { id: existingFollow.id },
                    data: { notify }
                });
                return NextResponse.json({ 
                    message: 'Notification preference updated', 
                    isFollowing: true,
                    notify: updated.notify
                }, { status: 200 });
            }

            // Otherwise, a standard POST means they want to UNFOLLOW
            await prisma.storeFollow.delete({
                where: { id: existingFollow.id }
            });

            return NextResponse.json({ 
                message: 'Unfollowed successfully', 
                isFollowing: false,
                notify: false
            }, { status: 200 });
        } else {
            // They are not following, so FOLLOW
            const newFollow = await prisma.storeFollow.create({
                data: {
                    userId,
                    storeId,
                    notify: typeof notify === 'boolean' ? notify : true
                }
            });

            return NextResponse.json({ 
                message: 'Followed successfully', 
                isFollowing: true,
                notify: newFollow.notify
            }, { status: 201 });
        }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error('Follow Store Error:', error);
        return NextResponse.json(
            { message: 'Internal server error while following store' },
            { status: 500 }
        );
    }
}

// Check initial status for client-side hydration
export async function GET(
    req: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        const { slug } = await params;

        if (!session?.user?.id) {
            return NextResponse.json({ isFollowing: false, notify: false }, { status: 200 });
        }

        const store = await prisma.store.findUnique({
            where: { slug },
            select: { id: true }
        });

        if (!store) {
            return NextResponse.json({ message: 'Store not found' }, { status: 404 });
        }

        const existingFollow = await prisma.storeFollow.findUnique({
            where: {
                userId_storeId: { userId: session.user.id, storeId: store.id }
            }
        });

        return NextResponse.json({
            isFollowing: !!existingFollow,
            notify: existingFollow?.notify ?? false
        }, { status: 200 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        return NextResponse.json(
            { message: 'Internal server error checking follow status' },
            { status: 500 }
        );
    }
}
