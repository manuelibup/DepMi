import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';

/**
 * Universal handle resolver — depmi.com/[handle]
 * Resolves to a user profile or store page.
 * Named routes (/about, /blog, /store, etc.) always take priority over this catch-all.
 */
export default async function HandlePage({ params }: { params: Promise<{ handle: string }> }) {
    const { handle } = await params;

    // Check user first
    const user = await (prisma.user as any).findFirst({
        where: { username: { equals: handle, mode: 'insensitive' } },
        select: { username: true },
    });
    if (user) redirect(`/u/${user.username}`);

    // Check store
    const store = await prisma.store.findFirst({
        where: { slug: { equals: handle, mode: 'insensitive' } },
        select: { slug: true },
    });
    if (store) redirect(`/store/${store.slug}`);

    notFound();
}
