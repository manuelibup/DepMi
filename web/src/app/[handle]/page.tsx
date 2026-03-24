import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import StorefrontPage from '@/app/store/[slug]/page';
import UserProfilePage from '@/app/u/[username]/page';

/**
 * Universal handle resolver — depmi.com/[handle]
 * Renders user profile or store content directly at the clean URL.
 * /store/[slug] and /u/[username] 301-redirect here via next.config.ts.
 */
export default async function HandlePage({ params }: { params: Promise<{ handle: string }> }) {
    const { handle } = await params;

    // Check user first
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = await (prisma.user as any).findFirst({
        where: { username: { equals: handle, mode: 'insensitive' } },
        select: { username: true },
    });
    if (user) {
        return UserProfilePage({ params: Promise.resolve({ username: user.username }) });
    }

    // Check store
    const store = await prisma.store.findFirst({
        where: { slug: { equals: handle, mode: 'insensitive' } },
        select: { slug: true },
    });
    if (store) {
        return StorefrontPage({ params: Promise.resolve({ slug: store.slug }) });
    }

    notFound();
}
