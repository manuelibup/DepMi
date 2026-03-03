import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

// /profile → redirect to /u/[username] for the logged-in user
export default async function ProfileRedirectPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        redirect('/login?callbackUrl=/profile');
    }

    // Look up username in case session token is stale
    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { username: true }
    });

    if (!user?.username) {
        // Username not set yet — send to onboarding
        redirect('/onboarding');
    }

    redirect(`/u/${user.username}`);
}
