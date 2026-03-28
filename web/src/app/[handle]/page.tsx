import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import StorefrontPage from '@/app/store/[slug]/page';
import UserProfilePage from '@/app/u/[username]/page';

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
    const { handle } = await params;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = await (prisma.user as any).findFirst({
        where: { username: { equals: handle, mode: 'insensitive' } },
        select: { displayName: true, username: true, bio: true, avatarUrl: true },
    });
    if (user) {
        const desc = user.bio || `Follow ${user.displayName} on DepMi`;
        return {
            title: `${user.displayName} (@${user.username}) · DepMi`,
            description: desc,
            alternates: { canonical: `https://depmi.com/${user.username}` },
            openGraph: {
                title: `${user.displayName} (@${user.username})`,
                description: desc,
                images: user.avatarUrl ? [{ url: user.avatarUrl, alt: user.displayName }] : undefined,
            },
            twitter: {
                card: 'summary_large_image',
                title: `${user.displayName} (@${user.username})`,
                description: desc,
                images: user.avatarUrl ? [user.avatarUrl] : undefined,
            },
        };
    }

    const store = await prisma.store.findFirst({
        where: { slug: { equals: handle, mode: 'insensitive' } },
        select: { name: true, description: true, logoUrl: true, location: true, depCount: true, slug: true },
    });
    if (store) {
        const locationSuffix = store.location ? ` — ${store.location}` : '';
        const title = `${store.name}${locationSuffix} · DepMi`;
        const descParts: string[] = [store.description || `Shop ${store.name} on DepMi`];
        if (store.location) descParts.push(`Based in ${store.location}.`);
        if (store.depCount > 0) descParts.push(`${store.depCount} deps earned.`);
        const desc = descParts.join(' ');
        return {
            title,
            description: desc,
            alternates: { canonical: `https://depmi.com/${store.slug}` },
            openGraph: {
                title,
                description: desc,
                images: store.logoUrl ? [{ url: store.logoUrl, alt: store.name }] : undefined,
            },
            twitter: {
                card: 'summary_large_image',
                title,
                description: desc,
                images: store.logoUrl ? [store.logoUrl] : undefined,
            },
        };
    }

    return {};
}

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
