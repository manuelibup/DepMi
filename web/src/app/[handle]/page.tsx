import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import StorefrontPage from '@/app/store/[slug]/page';
import UserProfilePage from '@/app/u/[username]/page';
import { getCachedHandle } from '@/lib/resolveHandle';

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
    const { handle } = await params;
    const resolved = await getCachedHandle(handle);

    if (resolved?.type === 'user') {
        const user = resolved.data;
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

    if (resolved?.type === 'store') {
        const store = resolved.data;
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
 */
export default async function HandlePage({ params }: { params: Promise<{ handle: string }> }) {
    const { handle } = await params;
    const resolved = await getCachedHandle(handle);

    if (resolved?.type === 'user') {
        return UserProfilePage({ params: Promise.resolve({ username: resolved.data.username }) });
    }

    if (resolved?.type === 'store') {
        return StorefrontPage({ params: Promise.resolve({ slug: resolved.data.slug }) });
    }

    notFound();
}
