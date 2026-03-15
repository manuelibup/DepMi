import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const targets = ['toyoabasi', 'kemzino', 'synen'];

    // Find targets
    const targetUsers = await prisma.user.findMany({
        where: { username: { in: targets } }
    });
    console.log(`Found ${targetUsers.length} target users.`);

    // Get 50 random other users
    // Note: Since Prisma doesn't have native random ordering like sql RAND(), 
    // taking 50 will just get the first/oldest 50 users based on internal ordering.
    // For a simple mock operation, this is sufficient.
    const followers = await prisma.user.findMany({
        where: { username: { notIn: targets } },
        take: 50,
        select: { id: true, username: true }
    });

    console.log(`Found ${followers.length} other users to act as followers.`);

    for (const target of targetUsers) {
        let count = 0;
        console.log(`Assigning followers to ${target.username}...`);
        for (const follower of followers) {
            try {
                // Determine whether to create or ignore
                await prisma.userFollow.upsert({
                    where: {
                        followerId_followingId: {
                            followerId: follower.id,
                            followingId: target.id
                        }
                    },
                    update: {}, // Do nothing if it already exists
                    create: {
                        followerId: follower.id,
                        followingId: target.id
                    }
                });
                count++;
            } catch (err) {
                console.error(`Error assigning ${follower.username} to ${target.username}`);
            }
        }
        console.log(`✅ Assigned ${count} followers to @${target.username}.`);
    }
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    });
