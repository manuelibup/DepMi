import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        // Ensure user is an admin
        if (!session?.user?.id || (session.user as any).adminRole !== 'SUPERADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { username, count } = await req.json();

        if (!username || !count || count <= 0) {
            return NextResponse.json({ error: 'Invalid username or count' }, { status: 400 });
        }

        // Find the target user
        const targetUser = await prisma.user.findUnique({
            where: { username }
        });

        if (!targetUser) {
            return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
        }

        // Get random users to act as followers
        // We exclude the target user themselves
        const totalUsers = await prisma.user.count({
            where: { id: { not: targetUser.id } }
        });

        if (totalUsers === 0) {
            return NextResponse.json({ error: 'No potential followers found' }, { status: 400 });
        }

        const skip = Math.max(0, Math.floor(Math.random() * (totalUsers - count)));

        const potentialFollowers = await prisma.user.findMany({
            where: { id: { not: targetUser.id } },
            take: count,
            skip: skip,
            select: { id: true }
        });

        const followerIds = potentialFollowers.map(f => f.id);

        // Bulk create follows
        // Since Prisma doesn't have a bulk CreateMany for relations that handles duplicates gracefully on all DBs,
        // we'll do it in a transaction or loop for safety.
        let followCount = 0;
        for (const followerId of followerIds) {
            try {
                await prisma.userFollow.upsert({
                    where: {
                        followerId_followingId: {
                            followerId: followerId,
                            followingId: targetUser.id
                        }
                    },
                    update: {},
                    create: {
                        followerId: followerId,
                        followingId: targetUser.id
                    }
                });
                followCount++;
            } catch (e) {
                // Skip if error (e.g. unique constraint or other db issue)
            }
        }

        return NextResponse.json({
            message: `Successfully assigned ${followCount} followers to @${username}.`,
            count: followCount
        });

    } catch (error: any) {
        console.error('Bulk Follow Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
