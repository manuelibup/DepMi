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
    let username = session.user.username ?? null;
    try {
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { username: true }
        });
        username = user?.username ?? username;
    } catch {
        // DB unavailable — fall back to session token value
    }

    if (!username) {
        redirect('/onboarding');
    }

    redirect(`/u/${username}`);
}
