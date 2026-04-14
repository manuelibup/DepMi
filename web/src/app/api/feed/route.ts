import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCachedFeedPage, personalizeItems } from '@/lib/feed';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get('cursor');
    const category = searchParams.get('category') || undefined;
    const sort = searchParams.get('sort') || undefined;
    const take = Math.min(Number(searchParams.get('take') || '32'), 32);

    const session = await getServerSession(authOptions);
    const userId = session?.user?.id ?? null;

    const { items, nextCursor } = await getCachedFeedPage(cursor, category, take, sort);

    // Fetch user personalization — lightweight ID lookups only
    const personalizedItems = await personalizeItems(items, userId);

    const cacheHeader = userId
        ? 'private, max-age=15'
        : 'public, s-maxage=30, stale-while-revalidate=60';

    return NextResponse.json({
        items: personalizedItems,
        nextCursor,
        hasMore: nextCursor !== null,
    }, {
        headers: { 'Cache-Control': cacheHeader },
    });
}
